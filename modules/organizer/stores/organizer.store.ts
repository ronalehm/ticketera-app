import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrganizerEvent } from "../types/organizer.types";

type OrganizerState = {
  events: OrganizerEvent[];
  addEvent: (event: OrganizerEvent) => void;
};

// Solo lo usa el formulario de Crear evento hasta que persista en la BD (spec admin-panel F5a); el panel ya no lo lee.
// skipHydration: la rehidratación la dispara OrganizerEventForm al montar, para no romper la hidratación SSR.
export const useOrganizerStore = create<OrganizerState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),
    }),
    { name: "mentec-organizer-events", partialize: (state) => ({ events: state.events }), skipHydration: true },
  ),
);
