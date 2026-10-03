import { SiteShell } from "@/components/shared/SiteShell";
import { AuthBrandPanel } from "@/modules/auth";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <SiteShell>
      <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <AuthBrandPanel />
        <div className="flex justify-center bg-muted px-4 py-12 md:py-16">{children}</div>
      </div>
    </SiteShell>
  );
}
