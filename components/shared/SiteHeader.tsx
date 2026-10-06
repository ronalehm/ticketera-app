import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AuthHeaderActions } from "@/modules/auth/header";

const NAV_LINK =
  "inline-flex cursor-pointer items-center rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLogo preload className="h-7 w-auto md:h-8" />
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {/* Las categorías se exploran en /eventos y en el footer: el header solo enlaza al listado. */}
          <nav aria-label="Principal" className="hidden xl:flex">
            <Link href="/eventos" className={cn(NAV_LINK, "h-10 px-3")}>
              Eventos
            </Link>
          </nav>

          <AuthHeaderActions variant="bar" />

          <Sheet>
            <SheetTrigger
              aria-label="Abrir menú"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-11 cursor-pointer duration-200 xl:hidden",
              )}
            >
              <Menu className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Menú</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-4 pb-6">
                <AuthHeaderActions variant="sheet" />
                <nav aria-label="Principal" className="flex flex-col">
                  <SheetClose
                    nativeButton={false}
                    render={<Link href="/eventos" />}
                    className={cn(NAV_LINK, "h-11 px-3 text-base")}
                  >
                    Eventos
                  </SheetClose>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
