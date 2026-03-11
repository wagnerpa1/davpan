"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function RegisterForm({ className }: { className?: string }) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [isParent, setIsParent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Role logic: if parent, role="parent", otherwise "member"
      // If parent, maybe birthdate isn't strictly required for the parent themselves, 
      // but let's pass it anyway or leave it null if empty.
      const userData = {
        name: isParent ? "Elternteil" : name, // Falls Eltern, kann name optional sein oder wir fragen ihn trotzdem ab
        role: isParent ? "parent" : "member",
        birthdate: isParent ? null : birthdate,
      };

      // In real scenario we want Name even for parents:
      const finalData = {
        full_name: name,
        role: isParent ? "parent" : "member",
        birthdate: birthdate || null,
      };

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: finalData,
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // If successful (and maybe requires email confirmation):
      setIsSuccess(true);

    } catch (err: any) {
      setError(err.message || "Fehler bei der Registrierung.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col items-center justify-center space-y-4 text-center py-6", className)}>
        <div className="rounded-full bg-green-100 p-3 text-jdav-green">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Registrierung erfolgreich!</h3>
        <p className="text-sm text-slate-600">
          Wir haben dir einen Bestätigungslink an <strong>{email}</strong> gesendet.
          Bitte überprüfe dein Postfach und bestätige deine E-Mail-Adresse, um fortzufahren.
        </p>
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

  return (
    <div className={cn("grid gap-6", className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Konto-Typ</label>
           <div className="flex gap-4 mt-2">
             <label className="flex items-center gap-2 text-sm text-slate-600">
               <input 
                 type="radio" 
                 name="account_type" 
                 checked={!isParent} 
                 onChange={() => setIsParent(false)} 
                 className="text-jdav-green focus:ring-jdav-green"
               />
               Eigener Zugang (Mitglied)
             </label>
             <label className="flex items-center gap-2 text-sm text-slate-600">
               <input 
                 type="radio" 
                 name="account_type" 
                 checked={isParent} 
                 onChange={() => setIsParent(true)} 
                 className="text-jdav-green focus:ring-jdav-green"
               />
               Für mein Kind (Elternteil)
             </label>
           </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Name (Vor- und Nachname)</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>

        {!isParent && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Geburtsdatum</label>
            <input
              type="date"
              required={!isParent}
              value={birthdate}
              onChange={(e: any) => setBirthdate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">E-Mail Adresse</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Passwort</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>

        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading ? "Registriere..." : "Konto erstellen"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-slate-500">Du hast bereits ein Konto? </span>
        <a href="/login" className="font-medium text-jdav-green hover:underline">
          Anmelden
        </a>
      </div>
    </div>
  );
}
