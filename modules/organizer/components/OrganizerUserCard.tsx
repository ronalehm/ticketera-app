"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";

import { UserSummary } from "@/components/shared/UserSummary";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/modules/auth/session";

const FULL_WIDTH_BUTTON = "h-11 w-full cursor-pointer gap-2 duration-200";

// Tarjeta de usuario del panel (Decisión 9): sin sesión el panel sigue accesible y ofrece "Iniciar sesión".
export function OrganizerUserCard() {
  const { isLoaded, user, signOut } = useSessionUser();

  // Mientras Clerk carga no se muestra nada: evita un "Iniciar sesión" fugaz con sesión abierta.
  if (!isLoaded) return null;

  if (!user) {
    return (
      <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), FULL_WIDTH_BUTTON)}>
        <LogIn aria-hidden />
        Iniciar sesión
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <UserSummary firstName={user.firstName} lastName={user.lastName} email={user.email} />
      {/* signOut de la sesión ya redirige a "/" */}
      <Button type="button" variant="outline" className={FULL_WIDTH_BUTTON} onClick={() => signOut()}>
        <LogOut aria-hidden />
        Cerrar sesión
      </Button>
    </div>
  );
}
