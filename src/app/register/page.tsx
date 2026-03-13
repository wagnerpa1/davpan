import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center bg-green-50/50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Registrierung
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Erstelle ein Konto für dich oder deine Kinder
          </p>
        </div>
        
        <RegisterForm />
      </div>
    </div>
  );
}
