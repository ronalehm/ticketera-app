"use client";

import { UserAvatar } from "@/components/shared/UserAvatar";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFullName } from "@/lib/userName";
import { cn } from "@/lib/utils";
import { GoogleLogo } from "./GoogleLogo";

type GoogleAccountChooserProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
  account: { firstName: string; lastName: string; email: string };
};

/** Selector de cuenta simulado del acceso con Google (maqueta, sin conexión real). */
export function GoogleAccountChooser({ open, onOpenChange, onSelect, account }: GoogleAccountChooserProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <GoogleLogo className="size-6" />
          <DialogTitle>Elige una cuenta</DialogTitle>
          <DialogDescription>Modo demostración: no se conecta con Google.</DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={onSelect}
          className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left ring-1 ring-border transition-colors duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          <UserAvatar firstName={account.firstName} lastName={account.lastName} size="lg" />
          <span className="flex min-w-0 flex-col">
            {/* Los espacios van fuera de los sr-only para que el nombre accesible no los pierda. */}
            <span className="font-semibold wrap-break-word">
              <span className="sr-only">Continuar como</span> {getFullName(account.firstName, account.lastName)}
              <span className="sr-only">,</span>
            </span>{" "}
            <span className="text-sm text-muted-foreground wrap-anywhere">{account.email}</span>
          </span>
        </button>

        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: "outline" }), "h-11 cursor-pointer")}>
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
