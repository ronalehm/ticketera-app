"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";

import { UserAvatar } from "@/components/shared/UserAvatar";
import { UserSummary } from "@/components/shared/UserSummary";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getFullName } from "@/lib/userName";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/modules/auth/session";

const FULL_WIDTH_BUTTON = "h-11 w-full cursor-pointer gap-2 duration-200";
const ICON_BUTTON = "size-11 cursor-pointer duration-200";

type PanelUserCardProps = {
  /** "Organizador", "Administrador" o "Super admin" (`getPanelRoleLabel`). */
  roleLabel: string;
  /** Rail: solo avatar y botón con icono (nombre accesible en `aria-label`). */
  collapsed?: boolean;
};

// Tarjeta de usuario del panel: nombre, correo y rol, y "Cerrar sesión".
export function PanelUserCard({ roleLabel, collapsed = false }: PanelUserCardProps) {
  const { isLoaded, user, signOut } = useSessionUser();

  // Mientras Clerk carga no se muestra nada: evita un "Iniciar sesión" fugaz con sesión abierta.
  if (!isLoaded) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label={collapsed ? "Iniciar sesión" : undefined}
        title={collapsed ? "Iniciar sesión" : undefined}
        className={cn(buttonVariants({ variant: "outline" }), collapsed ? ICON_BUTTON : FULL_WIDTH_BUTTON)}
      >
        <LogIn aria-hidden />
        {!collapsed && "Iniciar sesión"}
      </Link>
    );
  }

  if (collapsed) {
    const fullName = getFullName(user.firstName, user.lastName);
    return (
      <div className="flex flex-col items-center gap-3">
        <UserAvatar size="lg" firstName={user.firstName} lastName={user.lastName} title={`${fullName} · ${roleLabel}`} />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className={ICON_BUTTON}
          onClick={() => signOut()}
        >
          <LogOut aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <UserSummary firstName={user.firstName} lastName={user.lastName} email={user.email} />
        {/* Alineado con la columna de texto de UserSummary (avatar 40 px + gap 12 px). */}
        <Badge variant="secondary" className="ms-13">
          {roleLabel}
        </Badge>
      </div>
      {/* signOut de la sesión ya redirige a "/" */}
      <Button type="button" variant="outline" className={FULL_WIDTH_BUTTON} onClick={() => signOut()}>
        <LogOut aria-hidden />
        Cerrar sesión
      </Button>
    </div>
  );
}
