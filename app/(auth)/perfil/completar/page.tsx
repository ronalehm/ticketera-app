import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CompleteProfileForm, getSafeRedirect, isProfileComplete } from "@/modules/auth";
import { requireUser } from "@/modules/auth/server";

export const metadata: Metadata = {
  title: "Completa tu perfil — Mentec Tickets",
  robots: { index: false },
};

export default async function CompleteProfilePage({ searchParams }: PageProps<"/perfil/completar">) {
  const user = await requireUser({ returnTo: "/perfil/completar", allowIncompleteProfile: true });
  const { redirect_url } = await searchParams;
  const redirectUrl = typeof redirect_url === "string" ? redirect_url : null;
  if (isProfileComplete(user)) redirect(getSafeRedirect(redirectUrl));

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <CompleteProfileForm redirectUrl={redirectUrl} />
    </div>
  );
}
