"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMaterialType } from "@/app/actions/admin-material";
import { Button } from "@/components/ui/button";

export function DeleteMaterialButton({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm("Dieses Material wirklich unwiderruflich löschen?"))
      return;

    setIsPending(true);
    const result = await deleteMaterialType(id);
    setIsPending(false);

    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleDelete}
      className="text-red-500 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
