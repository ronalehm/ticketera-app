"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";

import { UserSummary } from "@/components/shared/UserSummary";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/modules/auth/session";

const FULL_WIDTH_BUTTON = "h-11 w-full cursor-pointer gap-2 duration-200";

// Tarjeta de usuario del panel (Decisión 9): sin sesión el panel sigue accesible y ofrece "Iniciar sesión".
export function OrganizerUserCard() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  if (!user) {
    return (
      <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), FULL_WIDTH_BUTTON)}>
        <LogIn aria-hidden />
        Iniciar sesión
      </Link>
    );
  }

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-3">
      <UserSummary firstName={user.firstName} lastName={user.lastName} email={user.email} />
      <Button type="button" variant="outline" className={FULL_WIDTH_BUTTON} onClick={handleSignOut}>
        <LogOut aria-hidden />
        Cerrar sesión
      </Button>
    </div>
  );
}
