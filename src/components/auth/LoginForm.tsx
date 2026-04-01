"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

export function LoginForm({ className }: { className?: string }) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  // Use NEXT_PUBLIC_SITE_URL for consistent redirects across all environments
  // Falls auf .env gesetzt, sonst nutze window.location.origin
  const [redirectTo, setRedirectTo] = useState<string>("");

  useEffect(() => {
    // Priorität: NEXT_PUBLIC_SITE_URL (für Deployment) → window.location.origin (für Entwicklung)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setRedirectTo(`${siteUrl}/auth/callback`);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          router.push("/");
          router.refresh();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

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
            sign_in: {
              email_label: "E-Mail Adresse",
              password_label: "Passwort",
              button_label: "Anmelden",
              loading_button_label: "Melde an ...",
              link_text: "Du hast bereits ein Konto? Meld dich an",
              email_input_placeholder: "deine@email.com",
              password_input_placeholder: "Dein Passwort",
            },
            sign_up: {
              email_label: "E-Mail Adresse",
              password_label: "Passwort (min. 6 Zeichen)",
              button_label: "Registrieren",
              loading_button_label: "Registriere ...",
              link_text: "Du hast noch kein Konto? Registrier dich",
              email_input_placeholder: "deine@email.com",
              password_input_placeholder: "Dein Passwort",
            },
            forgotten_password: {
              email_label: "E-Mail Adresse",
              email_input_placeholder: "deine@email.com",
              button_label: "Passwort-Reset senden",
              loading_button_label: "Sende Reset-Link ...",
              link_text: "Passwort vergessen?",
              confirmation_text:
                "Überprüfe deine E-Mail für den Passwort-Reset-Link",
            },
          },
        }}
        providers={[]}
        view="sign_in"
        showLinks={false}
        theme="light"
        redirectTo={redirectTo || undefined}
      />
      <div className="space-y-3 text-center text-sm">
        <div>
          <a
            href="/auth/reset-password"
            className="text-slate-600 hover:text-jdav-green hover:underline"
          >
            Passwort vergessen?
          </a>
        </div>
        <div className="pt-2">
          <span className="text-slate-500">Du hast noch kein Konto? </span>
          <a
            href="/register"
            className="font-medium text-jdav-green-dark hover:underline"
          >
            Registrieren
          </a>
        </div>
      </div>
    </div>
  );
}
