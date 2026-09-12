import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClientSpy, sendMailSpy, createTransportSpy } = vi.hoisted(
  () => ({
    createAdminClientSpy: vi.fn(),
    sendMailSpy: vi.fn(),
    createTransportSpy: vi.fn(),
  }),
);

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: createAdminClientSpy,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportSpy,
  },
}));

vi.mock("@/lib/site-config", () => ({
  siteConfig: { appName: "DAV Test" },
}));

describe("maybeDispatchEmailForNotification", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sendMailSpy.mockResolvedValue({});
    createTransportSpy.mockReturnValue({ sendMail: sendMailSpy });

    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "noreply@example.com";
    process.env.SMTP_PASS = "secret";
  });

  it("sends mail to the user recipient for registration events", async () => {
    createAdminClientSpy.mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "member@example.com" } },
            error: null,
          }),
        },
      },
      from: vi.fn(),
    });

    const { maybeDispatchEmailForNotification } = await import(
      "../../src/lib/notifications/email-dispatcher"
    );

    await maybeDispatchEmailForNotification({
      type: "registration",
      recipientUserId: "user-1",
      recipientChildId: null,
      title: "Anmeldung bestätigt",
      body: "Du bist dabei",
    });

    expect(sendMailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "member@example.com",
        subject: "Anmeldung bestätigt",
        text: "Du bist dabei",
      }),
    );
  });

  it("resolves parent email for child recipients", async () => {
    const from = vi.fn((table: string) => {
      if (table === "child_notification_preferences") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { parent_id: "parent-1" },
                error: null,
              }),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createAdminClientSpy.mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "parent@example.com" } },
            error: null,
          }),
        },
      },
      from,
    });

    const { maybeDispatchEmailForNotification } = await import(
      "../../src/lib/notifications/email-dispatcher"
    );

    await maybeDispatchEmailForNotification({
      type: "waitlist",
      recipientUserId: null,
      recipientChildId: "child-1",
      title: "Nachgerückt",
      body: "Platz frei",
    });

    expect(sendMailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "parent@example.com",
        subject: "Nachgerückt",
      }),
    );
  });

  it("skips non-email notification types", async () => {
    createAdminClientSpy.mockReturnValue({
      auth: { admin: { getUserById: vi.fn() } },
      from: vi.fn(),
    });

    const { maybeDispatchEmailForNotification } = await import(
      "../../src/lib/notifications/email-dispatcher"
    );

    await maybeDispatchEmailForNotification({
      type: "news",
      recipientUserId: "user-1",
      recipientChildId: null,
      title: "News",
      body: "Body",
    });

    expect(createAdminClientSpy).not.toHaveBeenCalled();
    expect(sendMailSpy).not.toHaveBeenCalled();
  });

  it("propagates SMTP failures so outbox delivery can retry", async () => {
    createAdminClientSpy.mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "member@example.com" } },
            error: null,
          }),
        },
      },
      from: vi.fn(),
    });
    sendMailSpy.mockRejectedValue(new Error("SMTP unavailable"));

    const { maybeDispatchEmailForNotification } = await import(
      "../../src/lib/notifications/email-dispatcher"
    );

    await expect(
      maybeDispatchEmailForNotification({
        type: "registration",
        recipientUserId: "user-1",
        recipientChildId: null,
        title: "Anmeldung bestätigt",
        body: "Du bist dabei",
      }),
    ).rejects.toThrow("SMTP unavailable");
  });
});
