"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

type VenueMapProps = { venue: string; embedUrl: string | null };

const CONTAINER_CLASS = "relative aspect-[4/3] overflow-hidden bg-accent md:aspect-[16/7]";

// Click-to-load: el iframe de Google no entra en el DOM (ni hace peticiones) hasta que el usuario pulsa "Ver mapa".
export function VenueMap({ venue, embedUrl }: VenueMapProps) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const noticeId = useId();

  // El botón desaparece al cargar: el foco pasa al iframe para no perderse en <body>.
  useEffect(() => {
    if (loaded) iframeRef.current?.focus();
  }, [loaded]);

  if (embedUrl === null) {
    return (
      <div aria-hidden className={CONTAINER_CLASS}>
        <div className="flex size-full items-center justify-center">
          <MapPin className="size-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={CONTAINER_CLASS}>
      {loaded ? (
        <iframe
          ref={iframeRef}
          title={`Mapa de ${venue}`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="size-full border-0 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center">
          <MapPin aria-hidden className="size-8 text-primary" />
          <Button
            type="button"
            variant="outline"
            aria-describedby={noticeId}
            onClick={() => setLoaded(true)}
            className="h-11 cursor-pointer px-4 font-semibold duration-200"
          >
            Ver mapa
          </Button>
          <p id={noticeId} className="max-w-xs text-sm text-muted-foreground">
            Al ver el mapa se cargará contenido de Google Maps, que puede usar sus propias cookies.
          </p>
        </div>
      )}
    </div>
  );
}
