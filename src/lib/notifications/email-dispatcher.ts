import nodemailer from "nodemailer";

const smtpConfig = {
  host: process.env.SMTP_HOST || "",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
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
    const info = await transporter.sendMail({
      from: `"JDAV / DAV Pfarrkirchen" <${process.env.SMTP_USER}>`,
      to: email,
      subject: title,
      text: body,
      // You can add HTML formatting here later
    });
    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
