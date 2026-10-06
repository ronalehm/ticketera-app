import type { Metadata } from "next";

import {
  buildPanelNav,
  getPanelRoleLabel,
  PanelBreadcrumb,
  PanelMobileBar,
  PanelReadOnlyNotice,
  PanelSidebar,
} from "@/modules/panel";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  robots: { index: false },
};

// Shell del panel (organizador y admin): exige `panel:access`; un organizador no aprobado lo ve en solo lectura.
export default async function PanelLayout({ children }: LayoutProps<"/">) {
  const { user, organizerStatus, readOnly } = await getPanelContext("panel:access", { returnTo: "/organizador" });
  const sections = buildPanelNav(user.role);
  const roleLabel = getPanelRoleLabel(user.role);

  return (
    // El sidebar fija su ancho (264 px o rail de 76 px): columna `auto`.
    <div className="flex-1 bg-muted lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <PanelSidebar sections={sections} roleLabel={roleLabel} />
      <PanelMobileBar sections={sections} roleLabel={roleLabel} />
      <main className="min-w-0 px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <PanelBreadcrumb sections={sections} />
          {/* `readOnly` ya implica un estado distinto de approved; la segunda condición solo estrecha el tipo. */}
          {readOnly && organizerStatus !== "approved" && <PanelReadOnlyNotice status={organizerStatus} />}
          {children}
        </div>
      </main>
    </div>
  );
}
