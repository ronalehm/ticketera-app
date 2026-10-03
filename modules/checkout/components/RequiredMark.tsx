/** Marca visual de campo obligatorio. Oculta a la tecnología de apoyo: lo obligatorio lo comunica `required`. */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-destructive">
      *
    </span>
  );
}
