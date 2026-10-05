"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { useDeleteUser } from "../hooks/useUsers";
import type { UserListItem } from "../types/users.types";
import { getUserDisplayName } from "../utils/formatUser";
import { GENERIC_ERROR } from "../utils/userManagementError";
import { DIALOG_BUTTON_CLASS, DIALOG_FOOTER_CLASS } from "./dialogStyles";

type DeleteUserDialogProps = {
  actorId: string;
  /** Usuario que se elimina; se conserva al cerrar para la animación de salida. */
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Eliminado; `name` es su nombre visible antes de anonimizarlo. */
  onDeleted: (name: string) => void;
};

/** Confirmación de eliminar (anonimizar) un usuario. Si falla, el error se muestra aquí y se puede reintentar. */
export function DeleteUserDialog({ actorId, user, open, onOpenChange, onDeleted }: DeleteUserDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-5 p-5">
        {/* Dentro del popup: se desmonta al cerrar y cada apertura empieza sin el error anterior. */}
        {user && <DeleteUserConfirm actorId={actorId} user={user} onDeleted={onDeleted} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteUserConfirm({
  actorId,
  user,
  onDeleted,
}: Pick<DeleteUserDialogProps, "actorId" | "onDeleted"> & { user: UserListItem }) {
  const remove = useDeleteUser(actorId);
  const [error, setError] = useState<string | null>(null);
  const name = getUserDisplayName(user);

  async function handleConfirm() {
    setError(null);
    try {
      const result = await remove.mutateAsync(user.id);
      if (result.ok) onDeleted(name);
      else setError(result.error);
    } catch {
      setError(GENERIC_ERROR);
    }
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-xl font-bold">¿Eliminar a {name}?</AlertDialogTitle>
        <AlertDialogDescription className="text-base">
          Perderá el acceso a Mentec Tickets. Esta acción no se puede deshacer.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}
      <AlertDialogFooter className={DIALOG_FOOTER_CLASS}>
        <AlertDialogCancel className={DIALOG_BUTTON_CLASS} disabled={remove.isPending}>
          Cancelar
        </AlertDialogCancel>
        <AlertDialogAction
          className={cn(DIALOG_BUTTON_CLASS, "bg-destructive text-foreground hover:bg-destructive/90")}
          disabled={remove.isPending}
          onClick={handleConfirm}
        >
          {remove.isPending && <Spinner aria-hidden className="motion-reduce:animate-none" />}
          {remove.isPending ? "Eliminando…" : "Eliminar"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
