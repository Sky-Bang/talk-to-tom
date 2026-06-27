import { api } from "./client";
import type { Message, ChatRoom, SyncResponse } from "../types";

export const chatApi = {
  // Grup
  getGrupHistory: (before?: string) =>
    api.get<{ messages: Message[]; has_more: boolean }>(
      `/api/chat/grup/riwayat${before ? `?before=${before}` : ""}`
    ),

  sendGrupMessage: (data: {
    jenis: string; isi: string; keterangan?: string;
    ukuran_file?: number; durasi?: string; balas_ke?: number;
  }) => api.post<{ success: boolean; message: Message }>("/api/chat/grup/pesan", data),

  syncGrup: (lastTimestamp?: string) =>
    api.get<{ data: Message[]; last_timestamp: string; has_more: boolean }>(
      `/api/chat/grup/sync${lastTimestamp ? `?last_timestamp=${encodeURIComponent(lastTimestamp)}` : ""}`
    ),

  // Personal
  getDMHistory: (penerima: string) =>
    api.get<{ messages: Message[] }>(`/api/chat/personal/riwayat?penerima=${penerima}`),

  sendDMMessage: (data: {
    penerima: string; jenis: string; isi: string; keterangan?: string;
    ukuran_file?: number; durasi?: string; balas_ke?: number;
  }) => api.post<{ success: boolean; message: Message }>("/api/chat/personal/pesan", data),

  syncDM: (penerima: string, lastTimestamp?: string) =>
    api.get<{ data: Message[]; last_timestamp: string }>(
      `/api/chat/personal/sync?penerima=${penerima}${lastTimestamp ? `&last_timestamp=${encodeURIComponent(lastTimestamp)}` : ""}`
    ),

  getDMRooms: () =>
    api.get<{ rooms: ChatRoom[] }>("/api/chat/personal/ruang"),

  // Sync master (polling utama)
  sync: (lastTimestamp?: string) =>
    api.get<SyncResponse>(
      `/api/sync${lastTimestamp ? `?last_timestamp=${encodeURIComponent(lastTimestamp)}` : ""}`
    ),

  // Interaksi
  markRead: (id_pesan: number, tipe: "grup" | "personal") =>
    api.post("/api/chat/dibaca", { id_pesan, tipe }),

  react: (id_pesan: number, emoji: string, tipe: "grup" | "personal") =>
    api.post("/api/chat/reaksi", { id_pesan, emoji, tipe }),

  deleteMessage: (id_pesan: number, tipe: "grup" | "personal", cakupan: "semua" | "sendiri") =>
    api.post("/api/chat/hapus", { id_pesan, tipe, cakupan }),

  sendTyping: (sedang_mengetik: boolean, penerima?: string) =>
    api.post("/api/sync/typing", { sedang_mengetik, penerima }),
};
