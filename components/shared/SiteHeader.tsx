import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "@/modules/events";

const NAV_LINK =
  "inline-flex cursor-pointer items-center rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring";

const LOGIN_BUTTON = cn(buttonVariants(), "h-11 cursor-pointer px-4 font-semibold duration-200 hover:bg-primary-strong md:h-10");

const categoryLinks = EVENT_CATEGORIES.map((slug) => ({
  href: `/eventos?categoria=${slug}`,
  label: EVENT_CATEGORY_LABELS[slug],
}));

function SearchForm({ className }: { className?: string }) {
  return (
    <form action="/eventos" role="search" className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        name="q"
        aria-label="Buscar eventos"
        placeholder="Buscar eventos"
        className="h-11 pl-9 md:h-10"
      />
    </form>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLogo preload className="h-7 w-auto md:h-8" />
        </Link>

        <SearchForm className="hidden min-w-0 flex-1 md:block md:max-w-sm" />

        <nav aria-label="Categorías" className="ml-auto hidden shrink-0 lg:flex">
          {categoryLinks.map((link) => (
            <Link key={link.href} href={link.href} className={cn(NAV_LINK, "h-10 px-2 xl:px-3")}>
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/login" className={cn(LOGIN_BUTTON, "ml-auto hidden md:inline-flex lg:ml-0")}>
          Iniciar sesión
        </Link>

        <Sheet>
          <SheetTrigger
            aria-label="Abrir menú"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "ml-auto size-11 cursor-pointer duration-200 md:ml-0 lg:hidden",
            )}
          >
            <Menu className="size-5" aria-hidden />
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Menú</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 px-4 pb-6">
              <SearchForm />
              <nav aria-label="Categorías" className="flex flex-col">
                {categoryLinks.map((link) => (
                  <SheetClose
                    key={link.href}
                    nativeButton={false}
                    render={<Link href={link.href} />}
                    className={cn(NAV_LINK, "h-11 px-3 text-base")}
                  >
                    {link.label}
                  </SheetClose>
                ))}
              </nav>
              <SheetClose
                nativeButton={false}
                render={<Link href="/login" />}
                className={cn(LOGIN_BUTTON, "w-full")}
              >
                Iniciar sesión
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
