import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Registrierung
          </h1>
          <p className="mt-2 text-base text-slate-700">
            Erstelle ein Konto für dich oder deine Kinder
          </p>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}