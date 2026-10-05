"use client";

import { useId } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getPanelRoleLabel } from "@/modules/panel";

import { ORGANIZER_STATUS_BADGE, ROLE_BADGE_CLASS } from "../data/userBadges";
import type { UserListItem, UserOrganizerStatus, UserRole } from "../types/users.types";
import { formatUserDate, getUserDisplayName } from "../utils/formatUser";
import { getManageBlockReason, MANAGE_BLOCK_REASON_LABELS } from "../utils/manageBlockReason";

type Actor = { id: string; role: UserRole };

export type UserRowActions = {
  onEdit: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
  onSetStatus: (user: UserListItem, status: UserOrganizerStatus) => void;
  /** Usuario cuyo cambio de estado está en curso (su botón queda deshabilitado). */
  statusPendingId: string | null;
};

type UsersTableRowsProps = UserRowActions & {
  users: UserListItem[];
  actor: Actor;
  /** id del encabezado que nombra la tabla y la lista. */
  labelledBy: string;
};

const HEADER_CELL = "h-11 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase";
const BADGE = "h-6 px-2.5 font-semibold";

function RoleBadge({ role }: { role: UserRole }) {
  return <Badge className={cn(BADGE, ROLE_BADGE_CLASS[role])}>{getPanelRoleLabel(role)}</Badge>;
}

/** Estado de organizador: solo para el rol organizer (otro rol puede conservar una fila `suspended`). */
function OrganizerStatusBadge({ user }: { user: UserListItem }) {
  if (user.role !== "organizer" || !user.organizerStatus) return null;
  const badge = ORGANIZER_STATUS_BADGE[user.organizerStatus];
  return <Badge className={cn(BADGE, badge.className)}>{badge.label}</Badge>;
}

function UserIdentity({ user, isActor, as: Name }: { user: UserListItem; isActor: boolean; as: "p" | "h3" }) {
  const hasName = Boolean(user.firstName.trim() || user.lastName.trim());
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar size="lg" firstName={user.firstName || user.email} lastName={user.lastName} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Name className="truncate font-semibold">{getUserDisplayName(user)}</Name>
          {isActor && <Badge className={cn(BADGE, "bg-accent text-accent-foreground")}>Tú</Badge>}
          {/* Fila precreada por una invitación: aún no ha creado su cuenta en Clerk. */}
          {!user.hasClerkAccount && (
            <Badge variant="outline" className={cn(BADGE, "font-medium text-muted-foreground")}>
              Invitación pendiente
            </Badge>
          )}
        </div>
        {hasName && <p className="truncate text-sm text-muted-foreground">{user.email}</p>}
      </div>
    </div>
  );
}

const hasTaxData = (user: UserListItem) => Boolean(user.legalName && user.taxIdType && user.taxId);

/** Aprobar (pendiente o suspendido) o Suspender (aprobado). Aprobar sin datos fiscales queda deshabilitado con el motivo. */
function StatusButton({ user, name, onSetStatus, statusPendingId }: { user: UserListItem; name: string } & Pick<
  UserRowActions,
  "onSetStatus" | "statusPendingId"
>) {
  const hintId = useId();
  const approved = user.organizerStatus === "approved";
  const missingTaxData = !approved && !hasTaxData(user);
  const pending = statusPendingId === user.id;

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        className="h-11 cursor-pointer px-3 font-semibold"
        aria-label={`${approved ? "Suspender" : "Aprobar"} a ${name}`}
        aria-describedby={missingTaxData ? hintId : undefined}
        disabled={missingTaxData || pending}
        focusableWhenDisabled
        onClick={() => onSetStatus(user, approved ? "suspended" : "approved")}
      >
        {approved ? "Suspender" : "Aprobar"}
      </Button>
      {missingTaxData && (
        <p id={hintId} className="text-xs text-muted-foreground">
          Faltan datos fiscales
        </p>
      )}
    </div>
  );
}

function UserActions({ user, actor, onEdit, onDelete, onSetStatus, statusPendingId }: UserRowActions & {
  user: UserListItem;
  actor: Actor;
}) {
  const reason = getManageBlockReason(actor, user);
  if (reason) return <p className="text-sm text-muted-foreground">{MANAGE_BLOCK_REASON_LABELS[reason]}</p>;

  const name = getUserDisplayName(user);
  return (
    <div className="flex flex-wrap items-start gap-1">
      {user.role === "organizer" && (
        <StatusButton user={user} name={name} onSetStatus={onSetStatus} statusPendingId={statusPendingId} />
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-11 cursor-pointer"
        aria-label={`Editar a ${name}`}
        onClick={() => onEdit(user)}
      >
        <Pencil className="size-5" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Eliminar a ${name}`}
        onClick={() => onDelete(user)}
      >
        <Trash2 className="size-5" aria-hidden />
      </Button>
    </div>
  );
}

// Tabla en lg y tarjetas por debajo (patrón de OrganizerEventsTable): la versión oculta usa display:none, así que no se
// duplica en el árbol de accesibilidad.
export function UsersTableRows({ users, actor, labelledBy, ...actions }: UsersTableRowsProps) {
  return (
    <>
      <div className="hidden lg:block">
        <Table aria-labelledby={labelledBy}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={HEADER_CELL}>Usuario</TableHead>
              <TableHead className={HEADER_CELL}>Rol</TableHead>
              <TableHead className={HEADER_CELL}>Organizador</TableHead>
              <TableHead className={HEADER_CELL}>Registro</TableHead>
              <TableHead className={HEADER_CELL}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                {/* w-full + max-w-0: la columna ocupa el espacio libre y el nombre se trunca en vez de ensanchar la tabla. */}
                <TableHead scope="row" className="h-auto w-full max-w-0 px-6 py-3.5 font-normal">
                  <UserIdentity user={user} isActor={user.id === actor.id} as="p" />
                </TableHead>
                <TableCell className="px-6 py-3.5">
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell className="px-6 py-3.5">
                  <OrganizerStatusBadge user={user} />
                </TableCell>
                <TableCell className="px-6 py-3.5 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatUserDate(user.createdAt)}
                </TableCell>
                <TableCell className="px-6 py-3.5">
                  <UserActions user={user} actor={actor} {...actions} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-labelledby={labelledBy} className="space-y-3 lg:hidden">
        {users.map((user) => (
          <li key={user.id} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border">
            <UserIdentity user={user} isActor={user.id === actor.id} as="h3" />
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />
              <OrganizerStatusBadge user={user} />
              <span className="text-sm text-muted-foreground">Registro: {formatUserDate(user.createdAt)}</span>
            </div>
            <UserActions user={user} actor={actor} {...actions} />
          </li>
        ))}
      </ul>
    </>
  );
}
