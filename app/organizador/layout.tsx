import type { Metadata } from "next";

import { OrganizerMobileBar, OrganizerSidebar } from "@/modules/organizer";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function OrganizerLayout({ children }: LayoutProps<"/organizador">) {
  return (
    <div className="flex-1 bg-muted lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <OrganizerSidebar />
      <OrganizerMobileBar />
      <main className="min-w-0 px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
