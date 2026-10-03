import { NotFoundMessage } from "@/components/shared/NotFoundMessage";
import { SiteShell } from "@/components/shared/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundMessage
        title="No encontramos esta página"
        description="Puede que el enlace sea incorrecto o que la página ya no exista."
      />
    </SiteShell>
  );
}
