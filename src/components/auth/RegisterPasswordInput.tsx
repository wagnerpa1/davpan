"use client";

import { Eye, EyeOff } from "lucide-react";
import type { ChangeEvent } from "react";
import { useState } from "react";
import {
  MIN_PASSWORD_LENGTH,
  type PasswordStrength,
} from "@/lib/password-rules";
import { cn } from "@/lib/utils";

interface RegisterPasswordInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  passwordStrength: PasswordStrength;
}

export function RegisterPasswordInput({
  value,
  onChange,
  passwordStrength,
}: RegisterPasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <label
          htmlFor="register-password"
          className="block text-sm font-medium text-slate-700"
        >
          Passwort
        </label>
        {value.length > 0 && (
          <span className="text-xs font-medium text-slate-500">
            Stärke:{" "}
            <span
              className={cn(
                "font-semibold",
                passwordStrength.score >= 3
                  ? "text-green-600"
                  : passwordStrength.score === 2
                    ? "text-amber-600"
                    : "text-red-500",
              )}
            >
              {passwordStrength.label}
            </span>
          </span>
        )}
      </div>

      <div className="relative mt-1">
        <input
          id="register-password"
          type={showPassword ? "text" : "password"}
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={value}
          onChange={onChange}
          className="block w-full rounded-xl border border-slate-300 pr-10 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          placeholder="Mindestens 8 Zeichen"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
          aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {value.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                "h-1 rounded-full transition-colors",
                passwordStrength.score >= step
                  ? passwordStrength.colorClass
                  : "bg-slate-200",
              )}
            />
          ))}
        </div>
      )}

      <p className="mt-1 text-xs text-slate-500">
        Mindestens {MIN_PASSWORD_LENGTH} Zeichen, mind. 1 Buchstabe und 1 Ziffer
        oder Sonderzeichen.
      </p>
    </div>
  );
}
