// Entrada pública para el detalle público del evento (`EventEditLink`, spec event-editing, Decisión 4): solo la server
// action, sin arrastrar los componentes cliente del barrel ni el `server-only` de `./server`.
export { getEventEditHref } from "./actions/eventDrafts.actions";
