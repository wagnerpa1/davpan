"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { deleteMyAccount } from "@/app/actions/delete-account";

export function DeleteAccountButton() {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      confirm(
        "Bist du sicher, dass du deinen Account komplett löschen willst? Dieser Vorgang kann nicht rückgängig gemacht werden!",
      )
    ) {
      startTransition(async () => {
        try {
          await deleteMyAccount();
        } catch (error) {
          alert("Fehler beim Löschen des Accounts.");
          console.error(error);
        }
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 w-full disabled:opacity-50"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Lösche Account...
        </>
      ) : (
        "Account endgültig löschen"
      )}
    </button>
  );
}
