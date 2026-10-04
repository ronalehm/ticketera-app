"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { OrganizerBrand } from "./OrganizerBrand";
import { OrganizerNav } from "./OrganizerNav";
import { OrganizerUserCard } from "./OrganizerUserCard";

// Barra superior del panel por debajo de lg: marca y menú en Sheet con la navegación y la tarjeta de usuario.
export function OrganizerMobileBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b bg-background px-4 lg:hidden">
      <OrganizerBrand />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Abrir menú del panel"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 cursor-pointer")}
        >
          <Menu className="size-5" aria-hidden />
        </SheetTrigger>
        <SheetContent side="left" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Panel de organizador</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-6 px-4 pb-6">
            <OrganizerNav onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t pt-4">
              <OrganizerUserCard />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
