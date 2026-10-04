import type { Metadata } from "next";

import { UserProfile } from "@/modules/auth";
import { requireUser } from "@/modules/auth/server";

export const metadata: Metadata = {
  title: "Mi perfil | Mentec Tickets",
  robots: { index: false },
};

export default async function ProfilePage() {
  const user = await requireUser({ returnTo: "/perfil" });
  return <UserProfile user={user} />;
}
