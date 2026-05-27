import nodemailer from "nodemailer";
import { siteConfig } from "@/lib/site-config";

const port = parseInt(process.env.SMTP_PORT || "587", 10);
const isSecureEnv = process.env.SMTP_SECURE === "true";

const smtpConfig = {
  host: process.env.SMTP_HOST || "",
  port,
  // Nodemailer requires secure: false for port 587 (STARTTLS) and secure: true for 465 (TLS)
  secure: port === 465 ? true : port === 587 ? false : isSecureEnv,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

export async function dispatchEmailForNotification(
  email: string,
  title: string,
  body: string,
) {
  if (!smtpConfig.host || !smtpConfig.auth.user) {
    console.warn("SMTP config missing, skipping email dispatch to:", email);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${siteConfig.appName}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: title,
      text: body,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
