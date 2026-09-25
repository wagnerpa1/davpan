"use client";

import { Info } from "lucide-react";
import type { ChangeEvent } from "react";

interface MemberRegisterFieldsProps {
  membershipNumber: string;
  birthdate: string;
  onMembershipChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBirthdateChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function MemberRegisterFields({
  membershipNumber,
  birthdate,
  onMembershipChange,
  onBirthdateChange,
}: MemberRegisterFieldsProps) {
  return (
    <>
      <div>
        <label
          htmlFor="register-membership"
          className="block text-sm font-medium text-slate-700"
        >
          Mitgliedsnummer
        </label>
        <input
          id="register-membership"
          type="text"
          placeholder="209-00-001234"
          required
          value={membershipNumber}
          onChange={onMembershipChange}
          maxLength={14}
          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
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
          onChange={onBirthdateChange}
          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
        />
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2.5 text-xs text-slate-600">
        <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <span>
          Dein Name wird automatisch und geschützt aus der offiziellen
          Mitgliederdatenbank des DAV Pfarrkirchen übernommen.
        </span>
      </div>
    </>
  );
}
