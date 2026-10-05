import type { Metadata } from "next";
import { Users } from "lucide-react";

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "Usuarios y roles | Mentec Tickets",
};

// F1: encabezado y estado vacío; la tabla de usuarios llega en F4.
export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Usuarios y roles</h1>
      <Empty className="rounded-2xl border-2 border-dashed border-border bg-background px-6 py-14 md:py-20">
        <EmptyHeader className="max-w-md">
          <EmptyMedia variant="icon" aria-hidden className="size-14 rounded-2xl bg-accent text-accent-foreground">
            <Users className="size-7" />
          </EmptyMedia>
          <EmptyTitle className="text-xl font-bold">
            <h2>La gestión de usuarios llega en la siguiente fase</h2>
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
