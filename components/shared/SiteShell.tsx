import type { ReactNode } from "react";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { listEventCategories } from "@/modules/events/catalog";

export async function SiteShell({ children }: { children: ReactNode }) {
  const categories = await listEventCategories();
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter categories={categories} />
    </>
  );
}
