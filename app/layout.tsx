import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

const creatoDisplay = localFont({
  src: [
    { path: "./fonts/CreatoDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/CreatoDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/CreatoDisplay-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/CreatoDisplay-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Mentec Tickets — Entradas para conciertos, teatro y más",
  description:
    "Compra entradas para conciertos, teatro, deportes, festivales y más en Perú. Pago seguro y entrada digital con Mentec Tickets.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={cn("font-sans", creatoDisplay.variable)}>
      <body className="flex min-h-dvh flex-col">
        <ClerkProvider appearance={{ theme: shadcn }} localization={esES}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
