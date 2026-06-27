import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JWTPayload } from "../types";

interface AuthStore {
  payload: JWTPayload | null;
  isAuthenticated: boolean;
  setAuth: (payload: JWTPayload) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      payload: null,
      isAuthenticated: false,
      setAuth: (payload) => set({ payload, isAuthenticated: true }),
      clearAuth: () => set({ payload: null, isAuthenticated: false }),
    }),
    {
      name: "subserver-auth",
      partialize: (s) => ({ payload: s.payload, isAuthenticated: s.isAuthenticated }),
    }
  )
);
