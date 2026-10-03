import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrganizerEvent } from "../types/organizer.types";

type OrganizerState = {
  events: OrganizerEvent[];
  addEvent: (event: OrganizerEvent) => void;
};

// skipHydration: la rehidratación la disparan OrganizerDashboard y OrganizerEventForm al montar, para no romper la hidratación SSR.
export const useOrganizerStore = create<OrganizerState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),
    }),
    { name: "mentec-organizer-events", partialize: (state) => ({ events: state.events }), skipHydration: true },
  ),
);
