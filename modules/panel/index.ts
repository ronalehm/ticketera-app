// API pública del shell del panel (organizador y admin). La importa el layout de app/(panel).
export { PanelBreadcrumb } from "./components/PanelBreadcrumb";
export { PanelMobileBar } from "./components/PanelMobileBar";
export { PanelReadOnlyNotice } from "./components/PanelReadOnlyNotice";
export { PanelSidebar } from "./components/PanelSidebar";
export { buildPanelNav, getPanelRoleLabel } from "./utils/panelNav";
export type {
  PanelNavIcon,
  PanelNavItem,
  PanelNavSection,
  PanelOrganizerStatus,
  PanelRole,
} from "./types/panel.types";
