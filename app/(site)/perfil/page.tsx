import type { Metadata } from "next";

import { UserProfile } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Mi perfil | Mentec Tickets",
  robots: { index: false },
};

export default function ProfilePage() {
  return <UserProfile />;
}
