import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Passwort zurücksetzen
          </h1>
          <p className="mt-2 text-base text-slate-700">
            Gib deine E-Mail ein, um einen Reset-Link zu erhalten
          </p>
        </div>
        <ResetPasswordForm />

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Du hast dein Passwort wiederhergestellt?</p>
          <a
            href="/login"
            className="mt-2 inline-block font-medium text-jdav-green hover:text-jdav-green-dark hover:underline"
          >
            Zurück zum Login &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
