import { beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchNotification } from "../../src/lib/notifications/dispatcher";

const { enqueueSpy, pushDispatchSpy } = vi.hoisted(() => ({
  enqueueSpy: vi.fn(),
  pushDispatchSpy: vi.fn(),
}));

vi.mock("@/lib/notifications/push-dispatch", () => ({
  dispatchPushForNotification: pushDispatchSpy,
}));

vi.mock("@/lib/notifications/outbox", () => ({
  enqueueNotificationCreatedEvent: enqueueSpy,
  getNotificationDeliveryMode: vi.fn(() => "direct"),
}));

type PreferenceRow = {
  news_enabled: boolean;
  system_enabled: boolean;
  material_enabled: boolean;
  comments_enabled: boolean;
  group_notifications_enabled: boolean;
  tour_group_ids: string[];
};

function createSupabaseMock(options?: {
  userPrefs?: PreferenceRow | null;
  childPrefs?: PreferenceRow | null;
}) {
  const notificationInsertSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: "notification-1" }, error: null });
  const notificationInsertSelect = vi.fn(() => ({
    single: notificationInsertSingle,
  }));
  const notificationInsert = vi.fn(() => ({
    select: notificationInsertSelect,
  }));

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "notification_preferences") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: options?.userPrefs ?? null }),
            })),
          })),
        };
      }

      if (table === "child_notification_preferences") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: options?.childPrefs ?? null }),
            })),
          })),
        };
      }

      if (table === "notifications") {
        return {
          insert: notificationInsert,
        };
      }

      throw new Error(`Unexpected table access in test: ${table}`);
    }),
  };

  return {
    supabase,
    notificationInsert,
    notificationInsertSelect,
    notificationInsertSingle,
  };
}

describe("dispatchNotification opt-in filtering", () => {
  beforeEach(() => {
    enqueueSpy.mockReset();
    enqueueSpy.mockResolvedValue(true);
    pushDispatchSpy.mockReset();
  });

  it("insertet keine system-notification, wenn user system opt-out gesetzt hat", async () => {
    const { supabase, notificationInsert } = createSupabaseMock({
      userPrefs: {
        news_enabled: true,
        system_enabled: false,
        material_enabled: true,
        comments_enabled: true,
        group_notifications_enabled: true,
        tour_group_ids: [],
      },
    });

    await dispatchNotification(supabase as never, {
      type: "system",
      title: "System",
      body: "Wichtig",
      recipientUserId: "user-1",
      payload: { source: "admin_system_notification", url: "/" },
    });

    expect(notificationInsert).not.toHaveBeenCalled();
    expect(pushDispatchSpy).not.toHaveBeenCalled();
  });

  it("insertet notification mit sanitizter payload, wenn opt-in aktiv ist", async () => {
    const { supabase, notificationInsert } = createSupabaseMock({
      userPrefs: {
        news_enabled: true,
        system_enabled: true,
        material_enabled: true,
        comments_enabled: true,
        group_notifications_enabled: true,
        tour_group_ids: [],
      },
    });

    await dispatchNotification(supabase as never, {
      type: "registration",
      title: "Status",
      body: "Änderung",
      recipientUserId: "user-2",
      relatedTourId: "tour-1",
      payload: {
        participant_id: "p-1",
        old_status: "pending",
        new_status: "confirmed",
        url: "/touren/tour-1",
        emergency_phone: "+49123",
      },
    });

    expect(notificationInsert).toHaveBeenCalledTimes(1);

    const insertArg = notificationInsert.mock.calls[0][0] as {
      payload: Record<string, unknown>;
      recipient_user_id: string;
    };

    expect(insertArg.recipient_user_id).toBe("user-2");
    expect(insertArg.payload).toEqual({
      participant_id: "p-1",
      old_status: "pending",
      new_status: "confirmed",
      url: "/touren/tour-1",
    });
    expect(insertArg.payload).not.toHaveProperty("emergency_phone");
    expect(pushDispatchSpy).toHaveBeenCalledTimes(1);
  });

  it("queued event statt push, wenn outbox mode aktiv ist", async () => {
    const outboxModule = await import("@/lib/notifications/outbox");
    vi.mocked(outboxModule.getNotificationDeliveryMode).mockReturnValue(
      "outbox",
    );

    const { supabase } = createSupabaseMock({
      userPrefs: {
        news_enabled: true,
        system_enabled: true,
        material_enabled: true,
        comments_enabled: true,
        group_notifications_enabled: true,
        tour_group_ids: [],
      },
    });

    await dispatchNotification(supabase as never, {
      type: "system",
      title: "Outbox Test",
      body: "Wird in die Queue geschrieben",
      recipientUserId: "user-42",
      payload: { source: "admin_system_notification", url: "/" },
    });

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(pushDispatchSpy).not.toHaveBeenCalled();
  });
});
