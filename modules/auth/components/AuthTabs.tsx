import Link from "next/link";

import { cn } from "@/lib/utils";

type AuthTabsProps = {
  current: "login" | "register";
};

const AUTH_TABS = [
  { key: "login", label: "Iniciar sesión", href: "/login" },
  { key: "register", label: "Crear cuenta", href: "/registro" },
] as const;

// Enlaces (no role="tablist"): cada pestaña navega a su ruta.
export function AuthTabs({ current }: AuthTabsProps) {
  return (
    <nav aria-label="Acceso a tu cuenta">
      <ul className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {AUTH_TABS.map((tab) => {
          const isCurrent = tab.key === current;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isCurrent
                    ? "bg-background font-semibold text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
