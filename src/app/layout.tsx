import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import type React from "react";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Header } from "@/components/layout/Header";
import { PushNotificationInit } from "@/components/layout/PushNotificationInit";
import { PwaInstallPrompt } from "@/components/layout/PwaInstallPrompt";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { getCurrentUserProfile } from "@/lib/auth";
import { siteConfig } from "@/lib/site-config";
import { SerwistProvider } from "./serwist";

export const metadata: Metadata = {
  applicationName: siteConfig.appName,
  title: {
    default: siteConfig.appName,
    template: `%s | ${siteConfig.appName}`,
  },
  description: siteConfig.description,
  manifest: siteConfig.manifestPath,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.appName,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.appName,
    title: {
      default: siteConfig.appName,
      template: `%s | ${siteConfig.appName}`,
    },
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: {
      default: siteConfig.appName,
      template: `%s | ${siteConfig.appName}`,
    },
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const {
    birthdate,
    membershipNumber,
    role: userRole,
    isParent,
    user,
  } = await getCurrentUserProfile();

  return (
    <html lang="de" data-scroll-behavior="smooth">
      <body
        className={`${GeistSans.variable} flex min-h-screen flex-col antialiased`}
      >
        <SerwistProvider
          swUrl="/serwist/sw.js"
          register={true}
          options={{ scope: "/" }}
        >
          {user && (
            <Header
              birthdate={birthdate}
              membershipNumber={membershipNumber}
              userRole={userRole}
              isParent={isParent}
            />
          )}
          {user && <PushNotificationInit />} {user && <OfflineIndicator />}{" "}
          <PwaInstallPrompt />
          <main className={`flex-1 pb-16 md:pb-0 ${user ? "pt-16" : ""}`}>
            {children}
          </main>
          {user && <BottomNavigation userRole={userRole} />}
        </SerwistProvider>
      </body>
    </html>
  );
}
