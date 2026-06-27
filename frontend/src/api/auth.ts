import { api } from "./client";
import type { JWTPayload } from "../types";

export interface LoginResult {
  success: boolean;
  role: "admin" | "utama" | "anggota";
  name: string;
  subserver_id?: string;
  subserver_nama?: string;
  subserver_link?: string;
  redirect: string;
}

export const authApi = {
  validasi: (kode: string, subserver_link?: string) =>
    api.post<LoginResult>("/api/auth/validasi", { kode, subserver_link }),

  sesi: () =>
    api.get<{ authenticated: boolean; payload?: JWTPayload }>("/api/auth/sesi"),

  keluar: () => api.post("/api/auth/keluar"),

  refresh: () => api.post("/api/auth/refresh"),

  resolveLink: (link: string) =>
    api.get<{ subserver: { id: string; nama: string; link: string; aktif: boolean; suspended: boolean } }>(
      `/api/subserver/resolve/${link}`
    ),
};
