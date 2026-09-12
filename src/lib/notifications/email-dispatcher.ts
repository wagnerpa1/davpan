import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import { siteConfig } from "@/lib/site-config";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Tables } from "@/utils/supabase/types";

const EMAIL_NOTIFICATION_TYPES = new Set([
  "registration",
  "waitlist",
  "tour_update",
]);

interface EmailDispatchInput {
  type: string;
  recipientUserId: string | null;
  recipientChildId: string | null;
  title: string;
  body: string;
}

let transporter: Transporter | null = null;

function getSmtpConfig() {
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const isSecureEnv = process.env.SMTP_SECURE === "true";

  return {
    host: process.env.SMTP_HOST || "",
    port,
    // Nodemailer requires secure: false for port 587 (STARTTLS) and secure: true for 465 (TLS)
    secure: port === 465 ? true : port === 587 ? false : isSecureEnv,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  };
}

function isSmtpConfigured(config: ReturnType<typeof getSmtpConfig>) {
  return Boolean(config.host && config.auth.user && config.auth.pass);
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport(getSmtpConfig());
  return transporter;
}

async function resolveEmailTargetUserId(args: {
  recipientUserId: string | null;
  recipientChildId: string | null;
}) {
  if (args.recipientUserId) {
    return args.recipientUserId;
  }

  if (!args.recipientChildId) {
    return null;
  }

  const admin = createAdminClient();
  if (!admin) {
    return null;
  }

  const { data: childPrefsData } = await admin
    .from("child_notification_preferences")
    .select("parent_id")
    .eq("child_id", args.recipientChildId)
    .maybeSingle();

  const childPrefs = childPrefsData as Pick<
    Tables<"child_notification_preferences">,
    "parent_id"
  > | null;

  if (childPrefs?.parent_id) {
    return childPrefs.parent_id;
  }

  const { data: childProfileData } = await admin
    .from("child_profiles")
    .select("parent_id")
    .eq("id", args.recipientChildId)
    .maybeSingle();

  const childProfile = childProfileData as Pick<
    Tables<"child_profiles">,
    "parent_id"
  > | null;

  return childProfile?.parent_id ?? null;
}

export async function dispatchEmailForNotification(
  email: string,
  title: string,
  body: string,
) {
  const smtpConfig = getSmtpConfig();
  if (!isSmtpConfigured(smtpConfig)) {
    console.warn("SMTP config missing, skipping email dispatch to:", email);
    return;
  }

  await getTransporter().sendMail({
    from: `"${siteConfig.appName}" <${smtpConfig.auth.user}>`,
    to: email,
    subject: title,
    text: body,
  });
}

/** Sends email for registration/waitlist/tour_update, including parent mail for child recipients. */
export async function maybeDispatchEmailForNotification(
  input: EmailDispatchInput,
) {
  if (!EMAIL_NOTIFICATION_TYPES.has(input.type)) {
    return;
  }

  const targetUserId = await resolveEmailTargetUserId({
    recipientUserId: input.recipientUserId,
    recipientChildId: input.recipientChildId,
  });

  if (!targetUserId) {
    return;
  }

  const admin = createAdminClient();
  if (!admin) {
    return;
  }

  const { data: userData, error } =
    await admin.auth.admin.getUserById(targetUserId);

  if (error || !userData.user?.email) {
    if (error) {
      console.error(
        "[Email] Failed to resolve recipient email:",
        error.message,
      );
    }
    return;
  }

  await dispatchEmailForNotification(
    userData.user.email,
    input.title,
    input.body,
  );
}
