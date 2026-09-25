"use client";

import Link from "next/link";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  registerGuestAccount,
  registerMemberAccount,
} from "@/app/actions/auth-registration";
import { AccountTypeSelector } from "@/components/auth/AccountTypeSelector";
import { GuestRegisterFields } from "@/components/auth/GuestRegisterFields";
import { MemberRegisterFields } from "@/components/auth/MemberRegisterFields";
import { RegisterPasswordInput } from "@/components/auth/RegisterPasswordInput";
import { RegisterSuccessView } from "@/components/auth/RegisterSuccessView";
import { Button } from "@/components/ui/button";
import { getPasswordStrength, validatePassword } from "@/lib/password-rules";
import { cn } from "@/lib/utils";

function formatMembershipNumber(input: string) {
  const digitsOnly = input.replace(/\D/g, "");
  const limited = digitsOnly.slice(0, 11);

  if (limited.length <= 3) return limited;
  if (limited.length <= 5) return `${limited.slice(0, 3)}-${limited.slice(3)}`;

  return `${limited.slice(0, 3)}-${limited.slice(3, 5)}-${limited.slice(5)}`;
}

function handleInputChange(setter: (value: string) => void) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
  };
}

export function RegisterForm({ className }: { className?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requiresParentalApproval, setRequiresParentalApproval] =
    useState(false);

  // Registration Mode: "member" (Flow A) or "guest" (Flow B)
  const [mode, setMode] = useState<"member" | "guest">("member");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password],
  );

  const handleMembershipChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMembershipNumber(e.target.value);
    setMembershipNumber(formatted);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0]);
      setIsLoading(false);
      return;
    }

    try {
      if (mode === "member") {
        if (membershipNumber.replace(/-/g, "").length !== 11) {
          setError(
            "Mitgliedsnummer muss 11 Ziffern haben (Format: 209-00-001234)",
          );
          setIsLoading(false);
          return;
        }

        if (!birthdate) {
          setError("Bitte gib dein Geburtsdatum an.");
          setIsLoading(false);
          return;
        }

        const res = await registerMemberAccount({
          membershipNumber,
          birthdate,
          email,
          password,
        });

        if (!res.success) {
          setError(res.error?.message || "Fehler bei der Registrierung.");
          return;
        }

        setRequiresParentalApproval(
          Boolean(res.data?.requiresParentalApproval),
        );
        setIsSuccess(true);
      } else {
        if (!name.trim()) {
          setError("Bitte gib deinen vollständigen Namen an.");
          setIsLoading(false);
          return;
        }

        const res = await registerGuestAccount({
          fullName: name,
          birthdate: birthdate || null,
          email,
          password,
        });

        if (!res.success) {
          setError(res.error?.message || "Fehler bei der Registrierung.");
          return;
        }

        setRequiresParentalApproval(false);
        setIsSuccess(true);
      }
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
      <RegisterSuccessView
        email={email}
        requiresParentalApproval={requiresParentalApproval}
        className={className}
      />
    );
  }

  return (
    <div className={cn("grid gap-6", className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <AccountTypeSelector mode={mode} onSelectMode={setMode} />

        {mode === "member" ? (
          <MemberRegisterFields
            membershipNumber={membershipNumber}
            birthdate={birthdate}
            onMembershipChange={handleMembershipChange}
            onBirthdateChange={handleInputChange(setBirthdate)}
          />
        ) : (
          <GuestRegisterFields
            name={name}
            birthdate={birthdate}
            onNameChange={handleInputChange(setName)}
            onBirthdateChange={handleInputChange(setBirthdate)}
          />
        )}

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
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>

        <RegisterPasswordInput
          value={password}
          onChange={handleInputChange(setPassword)}
          passwordStrength={passwordStrength}
        />

        <Button
          type="submit"
          className="w-full mt-6 bg-jdav-green hover:bg-jdav-green-dark text-white shadow-md hover:shadow-lg transition-colors duration-200"
          disabled={isLoading}
        >
          {isLoading ? "Registriere..." : "Konto erstellen"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-slate-500">Du hast bereits ein Konto? </span>
        <Link
          href="/login"
          className="font-medium text-jdav-green hover:underline"
        >
          Anmelden
        </Link>
      </div>
    </div>
  );
}
