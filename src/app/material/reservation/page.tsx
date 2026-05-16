import { redirect } from "next/navigation";
import { canAccessMaterialAdmin, getCurrentUserProfile } from "@/lib/auth";

export default async function MaterialReservationRedirectPage() {
  const authContext = await getCurrentUserProfile();

  if (!canAccessMaterialAdmin(authContext.role)) {
    redirect("/material");
  }

  redirect("/admin/material/reservations");
}
