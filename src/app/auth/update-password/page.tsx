import type { Metadata } from "next";
import Link from "next/link";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Neues Passwort vergeben | DAV Pfarrkirchen",
  description: "Vergib ein neues, sicheres Passwort für dein Vereinskonto.",
};

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl min-h-[460px]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Neues Passwort festlegen
          </h1>
          <p className="mt-2 text-base text-slate-700">
            Gib ein neues, sicheres Passwort für deinen Zugang ein.
          </p>
        </div>

        <div className="min-h-[260px]">
          <UpdatePasswordForm />
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="mt-2 inline-block font-medium text-jdav-green hover:text-jdav-green-dark hover:underline"
          >
            Zurück zum Login &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
