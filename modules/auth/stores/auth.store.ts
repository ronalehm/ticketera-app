import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "../types/auth.types";

type AuthState = {
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
};

// skipHydration: la rehidratación la dispara el cliente al montar, para no romper la hidratación SSR.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    { name: "mentec-auth", partialize: (state) => ({ user: state.user }), skipHydration: true },
  ),
);
