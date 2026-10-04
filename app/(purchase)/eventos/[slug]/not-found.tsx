import { NotFoundMessage } from "@/components/shared/NotFoundMessage";
import { SiteShell } from "@/components/shared/SiteShell";

// (purchase) no tiene layout: quien llega a un evento inexistente no está comprando, así que ve el sitio.
export default function EventNotFound() {
  return (
    <SiteShell>
      <NotFoundMessage
        title="No encontramos este evento"
        description="Puede que el enlace sea incorrecto o que el evento ya no esté disponible."
      />
    </SiteShell>
  );
}
