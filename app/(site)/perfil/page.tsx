import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserProfile } from "@/modules/auth";
import { getSessionUser } from "@/modules/auth/server";

export const metadata: Metadata = {
  title: "Mi perfil | Mentec Tickets",
  robots: { index: false },
};

export default async function ProfilePage() {
  // El proxy ya exige sesión; `null` solo llega si la sesión desaparece entre medias.
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <UserProfile user={user} />;
}
