import { create } from "zustand";
import { persist } from "zustand/middleware";

type SavedEventsState = {
  slugs: string[];
  toggle: (slug: string) => void;
};

// skipHydration: la rehidratación la dispara el cliente al montar, para no romper la hidratación SSR.
export const useSavedEventsStore = create<SavedEventsState>()(
  persist(
    (set) => ({
      slugs: [],
      toggle: (slug) =>
        set((state) => ({
          slugs: state.slugs.includes(slug) ? state.slugs.filter((s) => s !== slug) : [...state.slugs, slug],
        })),
    }),
    { name: "mentec-saved", partialize: (state) => ({ slugs: state.slugs }), skipHydration: true },
  ),
);
