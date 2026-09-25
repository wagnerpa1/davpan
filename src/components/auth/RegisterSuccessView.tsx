"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RegisterSuccessViewProps {
  email: string;
  requiresParentalApproval: boolean;
  className?: string;
}

export function RegisterSuccessView({
  email,
  requiresParentalApproval,
  className,
}: RegisterSuccessViewProps) {
  const router = useRouter();

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

      {requiresParentalApproval && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-900">
          <p className="font-semibold mb-1">
            Hinweis für Jugendliche (16–17 Jahre):
          </p>
          <p>
            Gemäß den Sektionsrichtlinien ist für deine Teilnahme an Touren die
            Freigabe eines Erziehungsberechtigten erforderlich. Sobald du deine
            E-Mail bestätigt hast, kann ein verknüpftes Elternteil dein Konto
            über sein Profil freischalten.
          </p>
        </div>
      )}

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
