import { signIn } from "@/app/login/actions";

interface LoginFormProps {
  className?: string;
  errorMessage?: string | null;
}

export function LoginForm({ className, errorMessage }: LoginFormProps) {
  const emailId = "login-email";
  const passwordId = "login-password";

  return (
    <div className={`grid gap-6 ${className ?? ""}`}>
      <form className="grid gap-4" action={signIn}>
        <label
          htmlFor={emailId}
          className="grid gap-2 text-sm font-semibold text-slate-800"
        >
          <span>E-Mail Adresse</span>
          <input
            id={emailId}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="deine@email.com"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jdav-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </label>

        <label
          htmlFor={passwordId}
          className="grid gap-2 text-sm font-semibold text-slate-800"
        >
          <span>Passwort</span>
          <input
            id={passwordId}
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Dein Passwort"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jdav-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </label>

        {errorMessage && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          className="h-11 w-full rounded-xl bg-jdav-green font-semibold text-white shadow-sm transition-colors hover:bg-jdav-green-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          Anmelden
        </button>
      </form>

      <div className="space-y-3 text-center text-sm">
        <div>
          <a
            href="/auth/reset-password"
            className="text-slate-600 hover:text-jdav-green hover:underline"
          >
            Passwort vergessen?
          </a>
        </div>
        <div className="pt-2">
          <span className="text-slate-500">Du hast noch kein Konto? </span>
          <a
            href="/register"
            className="font-medium text-jdav-green-dark hover:underline"
          >
            Registrieren
          </a>
        </div>
      </div>
    </div>
  );
}
