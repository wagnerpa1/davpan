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
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
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
            label: "text-slate-700 font-medium",
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
              link_text: "Passwort vergessen?",
            },
          },
        }}
        providers={[]}
        view="sign_in"
        showLinks={false}
        theme="light"
        redirectTo={`${origin}/auth/callback`}
      />
      <div className="text-center text-sm">
        <span className="text-slate-500">Du hast noch kein Konto? </span>
        <a
          href="/register"
          className="font-medium text-jdav-green hover:underline"
        >
          Registrieren
        </a>
      </div>
    </div>
  );
}
