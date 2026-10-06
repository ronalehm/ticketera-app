"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSessionUser } from "../hooks/useSessionUser";
import { getAccountLinks } from "./accountLinks";
import { UserMenu } from "./UserMenu";
import { UserSummary } from "@/components/shared/UserSummary";

const PRIMARY_BUTTON = cn(
  buttonVariants(),
  "h-11 cursor-pointer px-4 font-semibold duration-200 hover:bg-primary-strong",
);

const OUTLINE_BUTTON = cn(buttonVariants({ variant: "outline" }), "h-11 cursor-pointer px-4 duration-200");

const BAR_ITEM = "hidden sm:inline-flex md:h-10";

const SHEET_BLOCK = "flex flex-col gap-3 border-b pb-6";

const SHEET_ACCOUNT_LINK =
  "flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors duration-200 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground";

type AuthHeaderActionsProps = {
  variant: "bar" | "sheet";
};

export function AuthHeaderActions({ variant }: AuthHeaderActionsProps) {
  const { isLoaded, user, signOut } = useSessionUser();
  const pathname = usePathname();

  if (variant === "bar") {
    // Mientras Clerk carga no se muestra nada: evita el parpadeo de "Iniciar sesión" con sesión abierta.
    if (!isLoaded) return null;
    if (user) {
      return (
        <UserMenu
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          role={user.role}
          pathname={pathname}
          onSignOut={signOut}
        />
      );
    }
    return (
      <>
        <Link href="/login" className={cn(OUTLINE_BUTTON, BAR_ITEM)}>
          Iniciar sesión
        </Link>
        <Link href="/registro" className={cn(PRIMARY_BUTTON, BAR_ITEM)}>
          Crear cuenta
        </Link>
      </>
    );
  }

  if (user) {
    return (
      <div className={SHEET_BLOCK}>
        <UserSummary
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          className="rounded-2xl bg-muted p-4"
        />
        <nav aria-label="Tu cuenta" className="flex flex-col">
          {getAccountLinks(user.role).map(({ href, label, icon: Icon }) => (
            <SheetClose
              key={href}
              nativeButton={false}
              render={<Link href={href} aria-current={pathname === href ? "page" : undefined} />}
              className={SHEET_ACCOUNT_LINK}
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </SheetClose>
          ))}
        </nav>
        <SheetClose onClick={signOut} className={cn(OUTLINE_BUTTON, "w-full")}>
          <LogOut aria-hidden />
          Cerrar sesión
        </SheetClose>
      </div>
    );
  }

  return (
    <div className={SHEET_BLOCK}>
      <SheetClose nativeButton={false} render={<Link href="/registro" />} className={cn(PRIMARY_BUTTON, "w-full")}>
        Crear cuenta
      </SheetClose>
      <SheetClose nativeButton={false} render={<Link href="/login" />} className={cn(OUTLINE_BUTTON, "w-full")}>
        Iniciar sesión
      </SheetClose>
    </div>
  );
}
