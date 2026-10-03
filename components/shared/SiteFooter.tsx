import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Separator } from "@/components/ui/separator";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "@/modules/events/format";

const FOCUS = "cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-highlight";

const LINK =
  `${FOCUS} inline-flex min-h-11 items-center gap-2 text-sm text-white/70 transition-colors duration-200 hover:text-white md:min-h-0`;

const COLUMNS: { title: string; links: { href: string; label: string; icon?: ReactNode }[] }[] = [
  {
    title: "Explorar",
    links: EVENT_CATEGORIES.map((slug) => ({
      href: `/eventos?categoria=${slug}`,
      label: EVENT_CATEGORY_LABELS[slug],
    })),
  },
  {
    title: "Mentec Tickets",
    links: [
      { href: "/nosotros", label: "Nosotros" },
      { href: "/organizadores", label: "Vende con nosotros" },
      { href: "/trabaja-con-nosotros", label: "Trabaja con nosotros" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { href: "/ayuda", label: "Centro de ayuda" },
      { href: "/terminos", label: "Términos y condiciones" },
      { href: "/privacidad", label: "Política de privacidad" },
      {
        href: "/libro-de-reclamaciones",
        label: "Libro de reclamaciones",
        icon: <BookOpen className="size-4" aria-hidden />,
      },
    ],
  },
];

// lucide-react v1 no incluye logos de marcas: trazos mínimos al estilo lucide.
const SOCIALS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com",
    icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com",
    icon: (
      <>
        <rect width="20" height="20" x="2" y="2" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com",
    icon: <path d="M9 12a4 4 0 1 0 4 4V2a5 5 0 0 0 5 5" />,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com",
    icon: (
      <>
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-brand-navy text-white print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-5 md:col-span-3 lg:col-span-2">
            <Link href="/" className={`${FOCUS} inline-block`}>
              <BrandLogo variant="white" className="h-8 w-auto" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-white/70">
              Entradas para conciertos, teatro, deportes y más en todo el Perú.
            </p>
            <ul className="flex gap-3">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`${FOCUS} inline-flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors duration-200 hover:bg-white/20`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
                      aria-hidden
                    >
                      {social.icon}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-3 text-xs font-bold tracking-wider uppercase">{column.title}</h2>
              <ul className="md:space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={LINK}>
                      {link.icon}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Separator className="my-8 bg-white/10" />

        <p className="text-sm text-white/70">
          © {new Date().getFullYear()} Mentec Tickets. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
