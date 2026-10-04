import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSecurity } from "@/modules/auth";
import { getSessionUser } from "@/modules/auth/server";

export const metadata: Metadata = {
  title: "Seguridad | Mentec Tickets",
  robots: { index: false },
};

export default async function SecurityPage() {
  // Sin `requireUser()`: su regla de MFA redirige aquí y entraría en bucle (Decisión 11).
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AccountSecurity user={user} />;
}
