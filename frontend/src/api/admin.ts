import { api } from "./client";
import type { Subserver, AdminStats } from "../types";

export const adminApi = {
  getDashboard: () =>
    api.get<{ stats: AdminStats; subservers: Subserver[] }>("/api/admin/dashboard"),

  createSubserver: (data: {
    nama: string; deskripsi?: string; max_anggota?: number;
    expired_at?: string; link: string; kode_utama: string;
  }) => api.post<{ success: boolean; id: string; nama: string; link: string; kode_utama: string }>(
    "/api/admin/subserver", data
  ),

  getSubservers: () => api.get<{ subservers: Subserver[] }>("/api/admin/subserver"),

  getSubserver: (id: string) =>
    api.get<{ subserver: Subserver; anggota: any[]; stats: any }>(`/api/admin/subserver/${id}`),

  updateSubserver: (id: string, data: Partial<Subserver>) =>
    api.put<{ success: boolean }>(`/api/admin/subserver/${id}`, data),

  updateLink: (id: string, link: string) =>
    api.put<{ success: boolean; link: string }>(`/api/admin/subserver/${id}/link`, { link }),

  updateKodeUtama: (id: string, kode_utama: string) =>
    api.put<{ success: boolean; kode_utama: string }>(`/api/admin/subserver/${id}/kode-utama`, { kode_utama }),

  setStatus: (id: string, suspended: boolean) =>
    api.put<{ success: boolean }>(`/api/admin/subserver/${id}/status`, { suspended }),

  deleteSubserver: (id: string) =>
    api.delete<{ success: boolean }>(`/api/admin/subserver/${id}`),

  getStats: () => api.get<AdminStats>("/api/admin/stats"),
};
