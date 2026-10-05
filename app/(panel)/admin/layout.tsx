import { requirePermission } from "@/modules/auth/server";

// Solo admin y super_admin (`users:manage`); un organizador vuelve a /organizador y un cliente a /.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requirePermission("users:manage", { returnTo: "/admin/usuarios" });
  return children;
}
