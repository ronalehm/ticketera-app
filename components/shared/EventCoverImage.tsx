import Image, { type ImageProps } from "next/image";

type EventCoverImageProps = Omit<ImageProps, "unoptimized">;

// Portada de evento (`events.image_url`): URL https de cualquier dominio. Se sirve sin optimizar para no abrir
// `images.remotePatterns`; las imágenes estáticas propias siguen pasando por el optimizador de next/image. Sin
// `Referer`: el dominio de la portada no sabe qué página de la app la pidió.
export function EventCoverImage({ alt, ...props }: EventCoverImageProps) {
  return <Image alt={alt} referrerPolicy="no-referrer" {...props} unoptimized />;
}
