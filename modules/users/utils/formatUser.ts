import { formatCount } from "@/lib/formatNumber";
import { getFullName } from "@/lib/userName";
import type { UserListItem } from "../types/users.types";

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Nombre completo o, si aún no tiene (invitado sin cuenta), el correo. */
export function getUserDisplayName(user: Pick<UserListItem, "firstName" | "lastName" | "email">): string {
  return getFullName(user.firstName, user.lastName) || user.email;
}

/** "2026-10-01T15:00:00Z" → "1 oct 2026" (zona America/Lima, mes corto en minúsculas y sin punto). */
export function formatUserDate(iso: string): string {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value.replace(/\./g, "").toLowerCase()]),
  );
  return `${parts.day} ${parts.month} ${parts.year}`;
}

/** "1 usuario registrado" / "1,234 usuarios registrados". */
export function formatRegisteredUsers(total: number): string {
  return total === 1 ? "1 usuario registrado" : `${formatCount(total)} usuarios registrados`;
}
