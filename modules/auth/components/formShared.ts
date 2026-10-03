export const GENERIC_ERROR = "No pudimos completar la solicitud. Inténtalo de nuevo.";

// Enlace dentro de una frase (WCAG 2.5.8 lo exime del tamaño mínimo): sin área ampliada para no tapar el texto vecino.
export const INLINE_LINK =
  "cursor-pointer rounded-sm font-medium text-primary-strong underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";

// Enlace suelto: el ::after amplía el área táctil a ≥ 44px (MASTER §11) sin cambiar el aspecto del enlace.
export const TEXT_LINK = `${INLINE_LINK} relative after:absolute after:-inset-x-1 after:-inset-y-3.5 after:content-['']`;
