"use client";

import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getPasswordStrength,
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from "@/lib/password-rules";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

function useSessionCheck() {
  const [supabase] = useState(() => createClient());
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (isMounted) {
          setIsAuthenticated(Boolean(user));
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return { supabase, isCheckingSession, isAuthenticated };
}

function ExpiredResetLinkNotice() {
  return (
    <div className="space-y-4 text-center py-6">
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
        <p className="font-semibold">Ungültiger oder abgelaufener Link</p>
        <p className="mt-1">
          Der Link zum Zurücksetzen des Passworts ist nicht mehr gültig oder
          bereits abgelaufen. Bitte fordere einen neuen Link an.
        </p>
      </div>
      <Button asChild className="w-full bg-jdav-green hover:bg-jdav-green-dark">
        <Link href="/auth/reset-password">Neuen Reset-Link anfordern</Link>
      </Button>
    </div>
  );
}

function PasswordUpdateSuccessNotice({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center py-6">
      <div className="rounded-full bg-green-100 p-3 text-jdav-green">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h3 className="text-xl font-bold text-slate-900">
        Passwort erfolgreich geändert!
      </h3>
      <p className="text-sm text-slate-600">
        Dein neues Passwort wurde sicher gespeichert. Du kannst dich jetzt mit
        deinem neuen Passwort anmelden.
      </p>
      <Button
        className="mt-4 w-full bg-jdav-green hover:bg-jdav-green-dark text-white"
        onClick={onLogin}
      >
        Zum Login
      </Button>
    </div>
  );
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) {
    return (
      <p className="mt-1 text-xs text-slate-500">
        Mindestens {MIN_PASSWORD_LENGTH} Zeichen, mind. 1 Buchstabe und 1 Ziffer
        oder Sonderzeichen.
      </p>
    );
  }

  const scoreTextColor =
    strength.score >= 3
      ? "text-green-600"
      : strength.score === 2
        ? "text-amber-600"
        : "text-red-500";

  return (
    <div className="mt-1 space-y-1">
      <div className="flex justify-end text-xs font-medium text-slate-500">
        Stärke:{" "}
        <span className={cn("ml-1 font-semibold", scoreTextColor)}>
          {strength.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              "h-1 rounded-full transition-colors",
              strength.score >= step ? strength.colorClass : "bg-slate-200",
            )}
          />
        ))}
      </div>
    </div>
  );
}

interface PasswordInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}

function PasswordInput({
  id,
  label,
  placeholder,
  value,
  onChange,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-xl border border-slate-300 pr-10 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
          aria-label={isVisible ? "Passwort verbergen" : "Passwort anzeigen"}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export function UpdatePasswordForm({ className }: { className?: string }) {
  const router = useRouter();
  const { supabase, isCheckingSession, isAuthenticated } = useSessionCheck();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (isCheckingSession) {
    return (
      <div className="space-y-4 py-8 animate-pulse text-center">
        <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
        <div className="h-10 bg-slate-100 rounded-xl" />
        <div className="h-10 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated && !isSuccess) {
    return <ExpiredResetLinkNotice />;
  }

  if (isSuccess) {
    return (
      <PasswordUpdateSuccessNotice onLogin={() => router.push("/login")} />
    );
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      setIsLoading(false);
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.errors[0]);
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Fehler beim Aktualisieren des Passworts.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("grid gap-6", className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <PasswordInput
            id="update-new-password"
            label="Neues Passwort"
            placeholder="Mindestens 8 Zeichen"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordStrengthMeter password={newPassword} />
        </div>

        <PasswordInput
          id="update-confirm-password"
          label="Neues Passwort bestätigen"
          placeholder="Passwort wiederholen"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <Button
          type="submit"
          className="w-full mt-6 bg-jdav-green hover:bg-jdav-green-dark text-white shadow-md hover:shadow-lg transition-colors duration-200"
          disabled={isLoading}
        >
          {isLoading ? "Speichere..." : "Neues Passwort speichern"}
        </Button>
      </form>
    </div>
  );
}
