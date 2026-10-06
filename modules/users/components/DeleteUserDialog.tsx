"use client";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import { useDeleteUser } from "../hooks/useUsers";
import type { UserListItem } from "../types/users.types";
import { getUserDisplayName } from "../utils/formatUser";
import { GENERIC_ERROR } from "../utils/userManagementError";

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
  const remove = useDeleteUser(actorId);
  const name = user ? getUserDisplayName(user) : "";

  async function handleConfirm() {
    if (!user) return null;
    const result = await remove.mutateAsync(user.id);
    if (!result.ok) return result.error;
    onDeleted(name);
    return null;
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`¿Eliminar a ${name}?`}
      description="Perderá el acceso a Mentec Tickets. Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      pendingLabel="Eliminando…"
      destructive
      onConfirm={handleConfirm}
      genericError={GENERIC_ERROR}
    />
  );
}
