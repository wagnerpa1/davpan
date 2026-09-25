"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveYouthAccount } from "@/app/actions/child-profiles";
import { AnimatedSubmitButton } from "@/components/ui/AnimatedSubmitButton";

export function ApproveYouthButton({ youthUserId }: { youthUserId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleApprove = async () => {
    setError(null);
    try {
      const res = await approveYouthAccount(youthUserId);
      if (!res.success) {
        setError(res.error?.message || "Fehler bei der Freigabe.");
        return;
      }
      setIsSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler bei der Freigabe.");
    }
  };

  if (isSuccess) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        Freigegeben
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <AnimatedSubmitButton
        successKey={`approve-youth-${youthUserId}`}
        onClick={handleApprove}
        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Konto freischalten
      </AnimatedSubmitButton>
    </div>
  );
}
