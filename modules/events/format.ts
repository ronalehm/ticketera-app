// Entrada pública separada del barrel: el código cliente formatea fechas, precios y categorías sin arrastrar los componentes de `events`.
export { formatEventDate, formatEventPrice, formatLongDate, formatTime } from "./utils/formatEvent";
export { EVENT_CATEGORY_LABELS } from "./data/categories";
