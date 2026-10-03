// Entrada pública de la vista previa del plano para otros módulos (p. ej. el formulario de organizer, que es
// cliente). El barrel `index.ts` arrastraría `TicketSelection` (react-zoom-pan-pinch) y services que importan
// el barrel de `events`; `seats.ts` es la entrada de servidor con una lista cerrada de reexportaciones.
export { SeatGridPreview } from "./components/SeatGridPreview";
export { getSeatRowLabels } from "./utils/rowLabels";
