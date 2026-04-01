"use client";

import JsBarcode from "jsbarcode";
import { Barcode } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface MemberBarcodePopupProps {
  membershipNumber: string | null;
  birthdate: string | null;
}

function toDigits(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  return input.replace(/\D/g, "");
}

function toDdMmYyyy(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}${month}${year}`;
  }

  const dottedMatch = input.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dottedMatch) {
    const [, day, month, year] = dottedMatch;
    return `${day}${month}${year}`;
  }

  const digitsOnly = toDigits(input);
  if (digitsOnly.length === 8) {
    return digitsOnly;
  }

  return "";
}

export function MemberBarcodePopup({
  membershipNumber,
  birthdate,
}: MemberBarcodePopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const memberDigits = useMemo(
    () => toDigits(membershipNumber),
    [membershipNumber],
  );
  const birthdateDdMmYyyy = useMemo(() => toDdMmYyyy(birthdate), [birthdate]);

  const barcodePayload = useMemo(() => {
    if (!memberDigits || !birthdateDdMmYyyy) {
      return "";
    }

    return `${memberDigits}${birthdateDdMmYyyy}`;
  }, [memberDigits, birthdateDdMmYyyy]);

  const canRenderBarcode = barcodePayload.length > 0;
  const missingMembershipNumber = memberDigits.length === 0;
  const missingBirthdate = birthdateDdMmYyyy.length === 0;

  useEffect(() => {
    if (!isOpen || !svgRef.current || !canRenderBarcode) {
      return;
    }

    JsBarcode(svgRef.current, barcodePayload, {
      format: "CODE128",
      width: 1,
      height: 72,
      margin: 6,
      displayValue: true,
      fontSize: 12,
      textMargin: 4,
    });
  }, [isOpen, canRenderBarcode, barcodePayload]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-jdav-green md:hidden"
        aria-label="Mitglieds-Barcode anzeigen"
      >
        <Barcode className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-60 md:hidden">
          <button
            type="button"
            aria-label="Barcode schließen"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm"
          />

          <div className="fixed inset-0 flex items-start justify-center px-4 pt-20 pb-6">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Mein Barcode
                </h2>
                <button
                  type="button"
                  className="text-xs font-semibold text-jdav-green hover:underline"
                  onClick={() => setIsOpen(false)}
                >
                  Schließen
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                {canRenderBarcode ? (
                  <div className="w-full">
                    <svg
                      ref={svgRef}
                      role="img"
                      aria-label="Barcode aus Mitgliedsnummer und Geburtsdatum"
                      className="mx-auto block h-auto w-full max-w-full"
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </div>
                ) : (
                  <div className="space-y-1 text-center text-sm text-red-600">
                    {missingMembershipNumber && (
                      <p>Mitgliedsnummer fehlt im Profil.</p>
                    )}
                    {missingBirthdate && (
                      <p>Geburtsdatum fehlt oder ist ungültig.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
