import type { Metadata } from "next";

import { SiteShell } from "@/components/shared/SiteShell";
import { OrganizerNav } from "@/modules/organizer";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function OrganizerLayout({ children }: LayoutProps<"/organizador">) {
  return (
    <SiteShell>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:px-8">
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <OrganizerNav />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </SiteShell>
  );
}
