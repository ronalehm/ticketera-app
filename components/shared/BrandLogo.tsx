import Image, { type ImageProps } from "next/image";

type BrandLogoProps = Omit<ImageProps, "src" | "alt"> & {
  variant?: "default" | "white";
};

const LOGO_SRC = {
  default: "/brand/mentec-logo.svg",
  white: "/brand/mentec-logo-white.svg",
} as const;

// SVG local: next/image lo sirve sin optimizar automáticamente (src termina en .svg).
export function BrandLogo({ variant = "default", ...props }: BrandLogoProps) {
  return (
    <Image
      src={LOGO_SRC[variant]}
      alt="Mentec Tickets"
      width={825}
      height={194}
      {...props}
    />
  );
}
