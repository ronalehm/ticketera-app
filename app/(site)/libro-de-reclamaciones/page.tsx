import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { ComplaintForm, ComplaintsBookInfo } from "@/modules/legal";

export const metadata: Metadata = { title: "Libro de Reclamaciones | Mentec Tickets" };

export default function ComplaintsBookPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8 md:mb-10 print:hidden">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-5xl">
          <BookOpen aria-hidden className="size-8 shrink-0 text-primary" />
          Libro de Reclamaciones
        </h1>
        <p className="mt-3 text-muted-foreground">Conforme al Código de Protección y Defensa del Consumidor.</p>
      </header>

      <div className="flex flex-col gap-8 md:gap-10">
        <ComplaintsBookInfo />
        <ComplaintForm />
      </div>
    </div>
  );
}
