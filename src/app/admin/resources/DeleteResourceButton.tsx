"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteResource } from "@/app/actions/admin-resources";
import { Button } from "@/components/ui/button";

export function DeleteResourceButton({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        "Ressource wirklich unwiderruflich löschen? Das könnte Touren beeinflussen!",
      )
    )
      return;

    setIsDeleting(true);
    const result = await deleteResource(resourceId);
    setIsDeleting(false);

    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleDelete}
      disabled={isDeleting}
      className="h-auto p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
      title="Ressource löschen"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
