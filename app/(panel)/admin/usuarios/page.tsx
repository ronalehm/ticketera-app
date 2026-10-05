import type { Metadata } from "next";

import { DEFAULT_USERS_FILTERS, UsersManager } from "@/modules/users";
import { listUsers } from "@/modules/users/server";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  title: "Usuarios y roles | Mentec Tickets",
};

export default async function AdminUsersPage() {
  // La página valida el permiso por su cuenta: el layout de /admin se renderiza en paralelo.
  const { user } = await getPanelContext("users:manage", { returnTo: "/admin/usuarios" });
  // Primera página sin filtros; el cliente la usa como datos iniciales (`useUsers`).
  const initialData = await listUsers(DEFAULT_USERS_FILTERS);

  return <UsersManager actor={{ id: user.id, role: user.role }} initialData={initialData} />;
}
