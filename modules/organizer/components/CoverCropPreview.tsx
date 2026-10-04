import Image from "next/image";

import { cn } from "@/lib/utils";

// Recortes de la portada en el sitio (decisión 9). Clases literales para que Tailwind las genere.
const COVER_CROPS: { caption: string; aspect: string; span?: string }[] = [
  { caption: "Página del evento · móvil", aspect: "aspect-[16/9]" },
  { caption: "Página del evento · escritorio", aspect: "aspect-[4/3]" },
  { caption: "Listado de eventos", aspect: "aspect-[2/1]" },
  { caption: "Inicio · escritorio", aspect: "aspect-[21/8]", span: "col-span-2" },
  { caption: "Inicio · móvil", aspect: "aspect-[4/5]" },
];

/** "Así se recorta tu portada": la misma imagen en cada proporción en que la muestra el sitio. */
export function CoverCropPreview({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <h3 className="text-sm font-semibold">Así se recorta tu portada</h3>
      {/* dense: en móvil (2 columnas), «Inicio · móvil» ocupa el hueco que deja el recorte de 2 columnas. */}
      <div className="grid grid-flow-row-dense grid-cols-2 items-start gap-3 md:grid-cols-3">
        {COVER_CROPS.map((crop) => (
          <figure key={crop.caption} className={cn("flex min-w-0 flex-col gap-1.5", crop.span)}>
            <div className={cn("relative overflow-hidden rounded-lg bg-muted", crop.aspect)}>
              <Image src={src} alt="" fill unoptimized sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
            </div>
            <figcaption className="text-xs text-muted-foreground">{crop.caption}</figcaption>
          </figure>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Los recortes de «Inicio» solo se usan si Mentec destaca tu evento en la portada.
      </p>
    </div>
  );
}
