import { OrganizerBrand } from "./OrganizerBrand";
import { OrganizerNav } from "./OrganizerNav";
import { OrganizerUserCard } from "./OrganizerUserCard";

// Sidebar del panel en lg (240 px desde el layout): fijo a toda la altura de la ventana.
export function OrganizerSidebar() {
  return (
    <header className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col lg:gap-8 lg:overflow-y-auto lg:border-r lg:bg-background lg:px-4 lg:py-6">
      <div className="px-2">
        <OrganizerBrand />
      </div>
      <OrganizerNav />
      <div className="mt-auto border-t pt-4">
        <OrganizerUserCard />
      </div>
    </header>
  );
}
