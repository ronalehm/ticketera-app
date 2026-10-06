import "server-only";

import { type Action, getOrganizerStatus, requirePermission } from "@/modules/auth/server";
import type { PanelContext } from "../types/panel.types";
import { isReadOnlyOrganizer } from "../utils/panelNav";

/**
 * Usuario con permiso para `action` (`requirePermission` redirige si no lo tiene) y su estado de organizador. Lo usan el
 * layout de `app/(panel)` y las páginas que dependen del estado (cada uno valida por su cuenta: se renderizan en paralelo).
 */
export async function getPanelContext(action: Action, options: { returnTo: string }): Promise<PanelContext> {
  const user = await requirePermission(action, options);
  const organizerStatus = user.role === "organizer" ? await getOrganizerStatus(user.id) : null;
  return { user, organizerStatus, readOnly: isReadOnlyOrganizer(user.role, organizerStatus) };
}
