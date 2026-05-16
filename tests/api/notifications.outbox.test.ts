import { beforeEach, describe, expect, it, vi } from "vitest";
import { processNotificationOutboxBatch } from "../../src/lib/notifications/outbox";

const { createAdminClientSpy, dispatchPushSpy } = vi.hoisted(() => ({
  createAdminClientSpy: vi.fn(),
  dispatchPushSpy: vi.fn(),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: createAdminClientSpy,
}));

vi.mock("@/lib/notifications/push-dispatch", () => ({
  dispatchPushForNotification: dispatchPushSpy,
}));

type OutboxRow = {
  id: number;
  event_key: string;
  aggregate_id: string;
  event_version: number;
  attempts: number;
};

function createOutboxSupabaseMock(options: {
  outboxRows: OutboxRow[];
  notificationById?: Record<
    string,
    {
      recipient_user_id: string | null;
      recipient_child_id: string | null;
      title: string;
      body: string;
      payload: Record<string, unknown>;
    } | null
  >;
  duplicateEventKeys?: Set<string>;
  maxProcessedVersionByAggregate?: Record<string, number>;
}) {
  const updates: Array<{ id: number; values: Record<string, unknown> }> = [];

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "notification_outbox") {
        return {
          select: vi.fn((columns: string) => {
            if (
              columns.includes("id, event_key, aggregate_id, event_version")
            ) {
              return {
                eq: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn().mockResolvedValue({
                        data: options.outboxRows,
                        error: null,
                      }),
                    })),
                  })),
                })),
              };
            }

            if (columns === "event_version") {
              return {
                eq: vi.fn((_aggregateColumn: string, aggregateId: string) => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn().mockResolvedValue({
                        data:
                          options.maxProcessedVersionByAggregate?.[
                            aggregateId
                          ] != null
                            ? [
                                {
                                  event_version:
                                    options.maxProcessedVersionByAggregate[
                                      aggregateId
                                    ],
                                },
                              ]
                            : [],
                        error: null,
                      }),
                    })),
                  })),
                })),
              };
            }

            throw new Error(
              `Unexpected notification_outbox select: ${columns}`,
            );
          }),
          update: vi.fn((values: Record<string, unknown>) => ({
            eq: vi.fn((_column: string, value: number) => {
              const id = Number(value);
              updates.push({ id, values });

              const result = Promise.resolve({
                data: {},
                error: null,
              }) as Promise<{
                data: Record<string, unknown>;
                error: { message: string } | null;
              }> & {
                eq: (
                  c: string,
                  v: string,
                ) => Promise<{
                  data: Record<string, unknown>;
                  error: { message: string } | null;
                }>;
              };

              result.eq = vi
                .fn()
                .mockResolvedValue({ data: {}, error: null }) as never;

              return result;
            }),
          })),
        };
      }

      if (table === "processed_events") {
        return {
          insert: vi.fn((values: { consumer: string; event_key: string }) => {
            if (options.duplicateEventKeys?.has(values.event_key)) {
              return Promise.resolve({
                error: { message: "duplicate", code: "23505" },
              });
            }

            return Promise.resolve({ error: null });
          }),
        };
      }

      if (table === "notifications") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_: string, notificationId: string) => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options.notificationById?.[notificationId] ?? null,
                error: null,
              }),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table in outbox test: ${table}`);
    }),
  };

  return { supabase, updates };
}

describe("processNotificationOutboxBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NOTIFICATION_OUTBOX_MAX_ATTEMPTS;
  });

  it("processes pending outbox items and marks them processed", async () => {
    const { supabase, updates } = createOutboxSupabaseMock({
      outboxRows: [
        {
          id: 1,
          event_key: "notification:1:created:v1",
          aggregate_id: "notification-1",
          event_version: 1,
          attempts: 0,
        },
      ],
      notificationById: {
        "notification-1": {
          recipient_user_id: "user-1",
          recipient_child_id: null,
          title: "Titel",
          body: "Body",
          payload: { url: "/touren/1" },
        },
      },
    });

    createAdminClientSpy.mockReturnValue(supabase as never);
    dispatchPushSpy.mockResolvedValue(undefined);

    const result = await processNotificationOutboxBatch({
      limit: 10,
      consumer: "push_dispatcher",
    });

    expect(result).toMatchObject({
      claimed: 1,
      processed: 1,
      failed: 0,
      skipped: 0,
      message: "ok",
    });
    expect(result.duration_ms).toEqual(expect.any(Number));
    expect(dispatchPushSpy).toHaveBeenCalledTimes(1);
    expect(updates.some((u) => u.values.status === "processed")).toBe(true);
  });

  it("skips duplicate events based on processed_events dedupe", async () => {
    const { supabase } = createOutboxSupabaseMock({
      outboxRows: [
        {
          id: 2,
          event_key: "notification:2:created:v1",
          aggregate_id: "notification-2",
          event_version: 1,
          attempts: 0,
        },
      ],
      duplicateEventKeys: new Set(["notification:2:created:v1"]),
    });

    createAdminClientSpy.mockReturnValue(supabase as never);

    const result = await processNotificationOutboxBatch({
      limit: 10,
      consumer: "push_dispatcher",
    });

    expect(result.claimed).toBe(1);
    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(dispatchPushSpy).not.toHaveBeenCalled();
  });

  it("requeues failed dispatches with incremented attempts", async () => {
    const { supabase, updates } = createOutboxSupabaseMock({
      outboxRows: [
        {
          id: 3,
          event_key: "notification:3:created:v1",
          aggregate_id: "notification-3",
          event_version: 1,
          attempts: 1,
        },
      ],
      notificationById: {
        "notification-3": {
          recipient_user_id: "user-3",
          recipient_child_id: null,
          title: "Titel",
          body: "Body",
          payload: { url: "/touren/3" },
        },
      },
    });

    createAdminClientSpy.mockReturnValue(supabase as never);
    dispatchPushSpy.mockRejectedValue(new Error("push failed"));

    const result = await processNotificationOutboxBatch({
      limit: 10,
      consumer: "push_dispatcher",
    });

    expect(result.claimed).toBe(1);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(
      updates.some(
        (u) =>
          u.values.status === "pending" &&
          u.values.attempts === 2 &&
          typeof u.values.available_at === "string",
      ),
    ).toBe(true);
  });

  it("marks entries as failed when max attempts are reached", async () => {
    process.env.NOTIFICATION_OUTBOX_MAX_ATTEMPTS = "3";

    const { supabase, updates } = createOutboxSupabaseMock({
      outboxRows: [
        {
          id: 4,
          event_key: "notification:4:created:v1",
          aggregate_id: "notification-4",
          event_version: 1,
          attempts: 2,
        },
      ],
      notificationById: {
        "notification-4": {
          recipient_user_id: "user-4",
          recipient_child_id: null,
          title: "Titel",
          body: "Body",
          payload: { url: "/touren/4" },
        },
      },
    });

    createAdminClientSpy.mockReturnValue(supabase as never);
    dispatchPushSpy.mockRejectedValue(new Error("hard fail"));

    const result = await processNotificationOutboxBatch({
      limit: 10,
      consumer: "push_dispatcher",
    });

    expect(result.claimed).toBe(1);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(
      updates.some(
        (u) =>
          u.values.status === "failed" &&
          u.values.attempts === 3 &&
          typeof u.values.last_error === "string" &&
          String(u.values.last_error).includes("max attempts reached"),
      ),
    ).toBe(true);
  });

  it("suppresses stale out-of-order events by event_version", async () => {
    const { supabase, updates } = createOutboxSupabaseMock({
      outboxRows: [
        {
          id: 5,
          event_key: "notification:5:created:v1",
          aggregate_id: "notification-5",
          event_version: 1,
          attempts: 0,
        },
      ],
      maxProcessedVersionByAggregate: {
        "notification-5": 2,
      },
    });

    createAdminClientSpy.mockReturnValue(supabase as never);

    const result = await processNotificationOutboxBatch({
      limit: 10,
      consumer: "push_dispatcher",
    });

    expect(result.claimed).toBe(1);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(dispatchPushSpy).not.toHaveBeenCalled();
    expect(
      updates.some(
        (u) =>
          u.values.status === "processed" &&
          typeof u.values.last_error === "string" &&
          String(u.values.last_error).includes("stale event suppressed"),
      ),
    ).toBe(true);
  });
});
