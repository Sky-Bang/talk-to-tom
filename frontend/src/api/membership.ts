import { api } from "./client";
import type { Contact, Subserver } from "../types";

export const membershipApi = {
  getAnggota: () => api.get<{ anggota: Contact[] }>("/api/subserver/anggota"),

  addAnggota: (nama: string, kode_anggota: string) =>
    api.post<{ success: boolean; kode_anggota: string; nama: string; message: string }>(
      "/api/subserver/anggota",
      { nama, kode_anggota }
    ),

  deleteAnggota: (kode: string) =>
    api.delete<{ success: boolean; message: string }>(`/api/subserver/anggota/${kode}`),

  resetKode: (kode_lama: string, kode_baru: string) =>
    api.post<{ success: boolean; kode_lama: string; kode_baru: string }>(
      `/api/subserver/anggota/${kode_lama}/reset`,
      { kode_baru }
    ),

  getInfo: () => api.get<{ subserver: Subserver }>("/api/subserver/info"),
};
