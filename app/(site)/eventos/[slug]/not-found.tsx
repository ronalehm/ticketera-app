import { NotFoundMessage } from "@/components/shared/NotFoundMessage";

export default function EventNotFound() {
  return (
    <NotFoundMessage
      title="No encontramos este evento"
      description="Puede que el enlace sea incorrecto o que el evento ya no esté disponible."
    />
  );
}
