"use client";

import type { ChangeEvent } from "react";

interface GuestRegisterFieldsProps {
  name: string;
  birthdate: string;
  onNameChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBirthdateChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function GuestRegisterFields({
  name,
  birthdate,
  onNameChange,
  onBirthdateChange,
}: GuestRegisterFieldsProps) {
  return (
    <>
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
          onChange={onNameChange}
          placeholder="Max Mustermann"
          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
        />
      </div>

      <div>
        <label
          htmlFor="register-birthdate-guest"
          className="block text-sm font-medium text-slate-700"
        >
          Geburtsdatum{" "}
          <span className="text-xs text-slate-500">(optional)</span>
        </label>
        <input
          id="register-birthdate-guest"
          type="date"
          value={birthdate}
          onChange={onBirthdateChange}
          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
        />
      </div>
    </>
  );
}
