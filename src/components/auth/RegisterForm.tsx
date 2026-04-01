// noinspection GrazieInspection

"use client";

import { CheckCircle2, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

export function RegisterForm({ className }: { className?: string }) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [isParent, setIsParent] = useState(false);

  const handleInputChange =
    (setter: (value: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
    };

  // Format membership number with automatic separation: XXX-XX-XXXXXX
  const formatMembershipNumber = (input: string): string => {
    // Remove all non-digits
    const digitsOnly = input.replace(/\D/g, "");
    // Limit to 11 digits
    const limited = digitsOnly.slice(0, 11);
    // Format: 3-2-6
    if (limited.length <= 3) return limited;
    if (limited.length <= 5)
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    return `${limited.slice(0, 3)}-${limited.slice(3, 5)}-${limited.slice(5)}`;
  };

  const handleMembershipChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMembershipNumber(e.target.value);
    setMembershipNumber(formatted);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (membershipNumber.replace(/-/g, "").length !== 11) {
      setError("Mitgliedsnummer muss 11 Ziffern haben (Format: 209-00-001234)");
      setIsLoading(false);
      return;
    }

    try {
      const finalData = {
        full_name: name,
        role: isParent ? "parent" : "member",
        birthdate: birthdate || null,
        membership_number: membershipNumber.replace(/-/g, ""),
      };

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: finalData,
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // If successful (and maybe requires email confirmation):
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Fehler bei der Registrierung.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center space-y-4 text-center py-6",
          className,
        )}
      >
        <div className="rounded-full bg-green-100 p-3 text-jdav-green">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          Registrierung erfolgreich!
        </h3>
        <p className="text-sm text-slate-600">
          Wir haben dir einen Bestätigungslink an <strong>{email}</strong>{" "}
          gesendet. Bitte überprüfe dein Postfach und bestätige deine
          E-Mail-Adresse, um fortzufahren.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/login")}
        >
          Zurück zum Login
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <fieldset>
          <legend className="block text-sm font-semibold text-slate-900 mb-3">
            Was ist dein Konto-Typ?
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {/* Member Card */}
            <button
              type="button"
              onClick={() => setIsParent(false)}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md",
                !isParent
                  ? "border-jdav-green bg-green-50 shadow-md shadow-green-200"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
              )}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    !isParent
                      ? "bg-jdav-green text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Eigenes Konto
                  </p>
                  <p className="text-xs text-slate-600">Für mich</p>
                </div>
              </div>
              {!isParent && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-jdav-green rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>

            {/* Parent Card */}
            <button
              type="button"
              onClick={() => setIsParent(true)}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md",
                isParent
                  ? "border-jdav-green bg-green-50 shadow-md shadow-green-200"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
              )}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    isParent
                      ? "bg-jdav-green text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Eltern-Konto
                  </p>
                  <p className="text-xs text-slate-600">Für Kinder</p>
                </div>
              </div>
              {isParent && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-jdav-green rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="register-name"
            className="block text-sm font-medium text-slate-700"
          >
            Name (Vor- und Nachname)
          </label>
          <input
            id="register-name"
            type="text"
            required
            value={name}
            onChange={handleInputChange(setName)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>

        <div>
          <label
            htmlFor="register-membership"
            className="block text-sm font-medium text-slate-700"
          >
            Mitgliedsnummer{" "}
            <span className="text-xs text-slate-500">
              (Sektion-Ortsgruppe-Nummer)
            </span>
          </label>
          <input
            id="register-membership"
            type="text"
            placeholder="209-00-001234"
            required
            value={membershipNumber}
            onChange={handleMembershipChange}
            maxLength={14}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
          <p className="mt-1 text-xs text-slate-500">
            Format: 3-stellig - 2-stellig - 6-stellig (z.B. 209-00-001234)
          </p>
        </div>

        <div>
          <label
            htmlFor="register-birthdate"
            className="block text-sm font-medium text-slate-700"
          >
            Geburtsdatum
          </label>
          <input
            id="register-birthdate"
            type="date"
            required
            value={birthdate}
            onChange={handleInputChange(setBirthdate)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="block text-sm font-medium text-slate-700"
          >
            E-Mail Adresse
          </label>
          <input
            id="register-email"
            type="email"
            required
            value={email}
            onChange={handleInputChange(setEmail)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="block text-sm font-medium text-slate-700"
          >
            Passwort
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={handleInputChange(setPassword)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-6 bg-jdav-green hover:bg-jdav-green-dark text-white shadow-md hover:shadow-lg transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? "Registriere..." : "Konto erstellen"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-slate-500">Du hast bereits ein Konto? </span>
        <a
          href="/login"
          className="font-medium text-jdav-green hover:underline"
        >
          Anmelden
        </a>
      </div>
    </div>
  );
}
