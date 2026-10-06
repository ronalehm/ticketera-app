// Entrada pública separada del barrel: el código cliente usa formatos de fecha y precio, ciudades y `categorySlugSchema` sin arrastrar los componentes de `events`.
export {
  formatEventDate,
  formatEventPrice,
  formatLongDate,
  formatLongDayMonth,
  formatShortDayMonth,
  formatTime,
  getDateChipParts,
} from "./utils/formatEvent";
export { CITIES } from "./data/searchOptions";
export { categorySlugSchema } from "./schemas/events.schema";
