"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ticket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../stores/auth.store";

const PRIMARY_BUTTON = cn(
  buttonVariants(),
  "h-11 cursor-pointer px-4 font-semibold duration-200 hover:bg-primary-strong",
);

const OUTLINE_BUTTON = cn(buttonVariants({ variant: "outline" }), "h-11 cursor-pointer px-4 duration-200");

const BAR_ITEM = "hidden sm:inline-flex md:h-10";

const MY_TICKETS_HREF = "/mis-entradas";

const MY_TICKETS_BAR_LINK = cn(
  buttonVariants({ variant: "ghost" }),
  "hidden h-10 cursor-pointer gap-2 px-3 font-semibold duration-200 md:inline-flex",
  "aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground",
);

type AuthHeaderActionsProps = {
  variant: "bar" | "sheet";
};

export function AuthHeaderActions({ variant }: AuthHeaderActionsProps) {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const pathname = usePathname();
  const myTicketsCurrent = pathname === MY_TICKETS_HREF ? "page" : undefined;

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  if (variant === "bar") {
    if (user) {
      return (
        <>
          <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">Hola, {user.firstName}</span>
          <Link href={MY_TICKETS_HREF} aria-current={myTicketsCurrent} className={MY_TICKETS_BAR_LINK}>
            <Ticket aria-hidden />
            Mis entradas
          </Link>
          <button type="button" onClick={signOut} className={cn(OUTLINE_BUTTON, BAR_ITEM)}>
            Cerrar sesión
          </button>
        </>
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

  return (
    <div className="flex flex-col gap-3">
      {user ? (
        <>
          <p className="truncate text-base font-medium">Hola, {user.firstName}</p>
          <SheetClose
            nativeButton={false}
            render={<Link href={MY_TICKETS_HREF} aria-current={myTicketsCurrent} />}
            className={cn(PRIMARY_BUTTON, "w-full")}
          >
            <Ticket aria-hidden />
            Mis entradas
          </SheetClose>
          <SheetClose onClick={signOut} className={cn(OUTLINE_BUTTON, "w-full")}>
            Cerrar sesión
          </SheetClose>
        </>
      ) : (
        <>
          <SheetClose nativeButton={false} render={<Link href="/registro" />} className={cn(PRIMARY_BUTTON, "w-full")}>
            Crear cuenta
          </SheetClose>
          <SheetClose nativeButton={false} render={<Link href="/login" />} className={cn(OUTLINE_BUTTON, "w-full")}>
            Iniciar sesión
          </SheetClose>
        </>
      )}
    </div>
  );
}
