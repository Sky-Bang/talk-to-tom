import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { authApi } from "../api/auth";

export function useAuth() {
  const { payload, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const checkSession = useCallback(async () => {
    try {
      const res = await authApi.sesi();
      if (res.authenticated && res.payload) {
        setAuth(res.payload);
      } else {
        clearAuth();
      }
    } catch {
      clearAuth();
    }
  }, [setAuth, clearAuth]);

  const logout = useCallback(async () => {
    await authApi.keluar().catch(() => {});
    clearAuth();
    navigate("/", { replace: true });
  }, [clearAuth, navigate]);

  return { payload, isAuthenticated, checkSession, logout };
}
