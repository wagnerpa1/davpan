import { LoginForm } from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams?: {
    error?: string | string[];
  };
}

function getLoginErrorMessage(searchParams?: LoginPageProps["searchParams"]) {
  const error = searchParams?.error;
  const value = Array.isArray(error) ? error[0] : error;

  return value ? decodeURIComponent(value) : null;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorMessage = getLoginErrorMessage(searchParams);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Willkommen zurück
          </h1>
          <p className="mt-2 text-base text-slate-700">
            Bitte melde dich an, um Fortzufahren
          </p>
        </div>
        <LoginForm errorMessage={errorMessage} />

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Du bist noch kein Mitglied oder möchtest nur stöbern?</p>
          <a
            href="/oeffentlich/touren"
            className="mt-2 inline-block font-medium text-jdav-green hover:text-jdav-green-dark hover:underline"
          >
            Zu den öffentlichen Touren &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
