"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

export function ResetPasswordForm({ className }: { className?: string }) {
  const [supabase] = useState(() => createClient());
  const [redirectTo, setRedirectTo] = useState<string>("");

  useEffect(() => {
    // Use NEXT_PUBLIC_SITE_URL for consistent redirects across all environments
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setRedirectTo(`${siteUrl}/auth/callback`);
  }, []);

  return (
    <div className={cn("grid gap-6", className)}>
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: "#76a355", // jdav-green
                brandAccent: "#5a8040", // jdav-green-dark
                brandButtonText: "white",
                defaultButtonBackground: "white",
                defaultButtonBackgroundHover: "#f8fafc",
                inputBackground: "white",
                inputBorder: "#e2e8f0",
                inputBorderHover: "#76a355",
                inputBorderFocus: "#76a355",
              },
              radii: {
                borderRadiusButton: "0.5rem",
                buttonBorderRadius: "0.5rem",
                inputBorderRadius: "0.5rem",
              },
            },
          },
          className: {
            button: "font-medium shadow-sm transition-colors",
            input: "shadow-sm transition-colors",
            label: "text-slate-800 font-semibold",
            message: "text-sm",
          },
        }}
        localization={{
          variables: {
            forgotten_password: {
              email_label: "E-Mail Adresse",
              email_input_placeholder: "deine@email.com",
              button_label: "Passwort-Reset senden",
              loading_button_label: "Sende Reset-Link ...",
              confirmation_text:
                "Überprüfe deine E-Mail für den Passwort-Reset-Link",
            },
            update_password: {
              password_label: "Neues Passwort",
              password_input_placeholder: "Dein neues Passwort",
              button_label: "Passwort aktualisieren",
              loading_button_label: "Aktualisiere ...",
              confirmation_text: "Dein Passwort wurde aktualisiert",
            },
          },
        }}
        providers={[]}
        view="forgotten_password"
        showLinks={false}
        theme="light"
        redirectTo={redirectTo || undefined}
      />
    </div>
  );
}
