"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, UserPlus, X } from "lucide-react";

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getPanelRoleLabel } from "@/modules/panel";

import { useSetOrganizerStatus, useUsers } from "../hooks/useUsers";
import { DEFAULT_USERS_FILTERS } from "../schemas/users.schema";
import type { InviteOutcome, UserListItem, UserOrganizerStatus, UserRole, UsersPage } from "../types/users.types";
import { formatRegisteredUsers, getUserDisplayName } from "../utils/formatUser";
import { GENERIC_ERROR } from "../utils/userManagementError";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { InviteUserDialog } from "./InviteUserDialog";
import { UsersTable } from "./UsersTable";

type Notice = { tone: "success" | "error"; message: string };

/** Diálogo abierto sobre un usuario; al cerrarlo se conserva el usuario para la animación de salida. */
type DialogTarget = { user: UserListItem | null; open: boolean };

const CLOSED: DialogTarget = { user: null, open: false };

function inviteMessage(email: string, role: UserRole, outcome: InviteOutcome): string {
  if (outcome === "invited") return `Invitación enviada a ${email}.`;
  if (outcome === "reinvited") return `Invitación reenviada a ${email}.`;
  return `${email} ya tenía cuenta: ahora es ${getPanelRoleLabel(role).toLowerCase()}.`;
}

type UsersManagerProps = {
  /** Usuario de la sesión (admin o super_admin). */
  actor: { id: string; role: UserRole };
  /** Primera página con `DEFAULT_USERS_FILTERS` (`listUsers` en el servidor). */
  initialData: UsersPage;
};

/**
 * "Usuarios y roles" (`/admin/usuarios`): encabezado con el total y "Invitar usuario", aviso del resultado de cada
 * acción, listado (`UsersTable`) y diálogos Invitar, Editar y Eliminar. Aprobar y Suspender van directos desde la fila.
 */
export function UsersManager({ actor, initialData }: UsersManagerProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<DialogTarget>(CLOSED);
  const [deleting, setDeleting] = useState<DialogTarget>(CLOSED);
  const setStatus = useSetOrganizerStatus(actor.id);
  // Total sin filtros: la misma query que la primera página por defecto (se recarga tras cada cambio).
  const { data: allUsers } = useUsers(actor.id, DEFAULT_USERS_FILTERS, initialData);
  const registered = allUsers?.total ?? initialData.total;

  function handleSetStatus(user: UserListItem, status: UserOrganizerStatus) {
    const name = getUserDisplayName(user);
    setNotice(null);
    setStatus.mutate(
      { id: user.id, status },
      {
        onSuccess: (result) =>
          setNotice(
            result.ok
              ? { tone: "success", message: `${name} fue ${status === "approved" ? "aprobado" : "suspendido"}.` }
              : { tone: "error", message: result.error },
          ),
        onError: () => setNotice({ tone: "error", message: GENERIC_ERROR }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Usuarios y roles</h1>
          <p className="text-base leading-relaxed text-muted-foreground tabular-nums">
            {formatRegisteredUsers(registered)}
          </p>
        </div>
        <Button
          className="h-11 w-full cursor-pointer px-4 font-semibold duration-200 hover:bg-primary-strong md:w-auto"
          onClick={() => {
            setNotice(null);
            setInviteOpen(true);
          }}
        >
          <UserPlus className="size-5" aria-hidden />
          Invitar usuario
        </Button>
      </header>

      {/* Región viva siempre presente: el aviso se anuncia al aparecer. */}
      <div aria-live="polite" aria-atomic="true">
        {notice && (
          // Sin role="alert": la región viva ya lo anuncia.
          <Alert role={undefined} variant={notice.tone === "error" ? "destructive" : "default"} className="py-3 pr-14 pl-4">
            {notice.tone === "error" ? <CircleAlert aria-hidden /> : <CircleCheck aria-hidden />}
            <AlertTitle className="self-center font-semibold">{notice.message}</AlertTitle>
            <AlertAction className="top-1 right-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-11 cursor-pointer"
                aria-label="Cerrar aviso"
                onClick={() => setNotice(null)}
              >
                <X className="size-5" aria-hidden />
              </Button>
            </AlertAction>
          </Alert>
        )}
      </div>

      <UsersTable
        actor={actor}
        initialData={initialData}
        onEdit={(user) => {
          setNotice(null);
          setEditing({ user, open: true });
        }}
        onDelete={(user) => {
          setNotice(null);
          setDeleting({ user, open: true });
        }}
        onSetStatus={handleSetStatus}
        statusPendingId={setStatus.isPending ? (setStatus.variables?.id ?? null) : null}
      />

      <InviteUserDialog
        actor={actor}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={({ email, role, outcome }) => {
          setInviteOpen(false);
          setNotice({ tone: "success", message: inviteMessage(email, role, outcome) });
        }}
      />
      <EditUserDialog
        actor={actor}
        user={editing.user}
        open={editing.open}
        onOpenChange={(open) => setEditing((current) => ({ ...current, open }))}
        onSaved={(name) => {
          setEditing((current) => ({ ...current, open: false }));
          setNotice({ tone: "success", message: `Cambios guardados para ${name}.` });
        }}
      />
      <DeleteUserDialog
        actorId={actor.id}
        user={deleting.user}
        open={deleting.open}
        onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
        onDeleted={(name) => {
          setDeleting((current) => ({ ...current, open: false }));
          setNotice({ tone: "success", message: `${name} fue eliminado.` });
        }}
      />
    </div>
  );
}
