import { cn } from "@/lib/utils";

// Clases compartidas por los campos del formulario de borrador (controles de 44 px, MASTER §11).

/** Margen de scroll de los controles: en móvil, la barra de acciones `sticky` no tapa el campo enfocado. */
export const FORM_CONTROL_SCROLL = "scroll-mt-24 scroll-mb-28 lg:scroll-mb-0";

export const FORM_INPUT_CLASS = cn("h-11", FORM_CONTROL_SCROLL);

export const FORM_SELECT_TRIGGER_CLASS = cn("w-full cursor-pointer data-[size=default]:h-11", FORM_CONTROL_SCROLL);
