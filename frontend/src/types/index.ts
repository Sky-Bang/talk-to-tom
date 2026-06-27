export interface JWTPayload {
  sub: string;
  role: "admin" | "utama" | "anggota";
  subserver_id: string;
  name: string;
  link?: string;
  iat: number;
  exp: number;
}

export interface AuthState {
  token: string | null;
  payload: JWTPayload | null;
  isAuthenticated: boolean;
}

export interface Subserver {
  id: string;
  nama: string;
  deskripsi?: string;
  link: string;
  kode_utama: string;
  max_anggota: number;
  expired_at?: number;
  aktif: boolean;
  suspended: boolean;
  dibuat_pada: number;
}

export interface Contact {
  kode_anggota: string;
  subserver_id: string;
  nama: string;
  foto_profil?: string;
  ditambahkan_oleh: string;
  aktif: boolean;
  dibuat_pada: number;
  dihapus_pada?: number;
}

export interface Message {
  id: number;
  subserver_id: string;
  pengirim: string;
  nama_pengirim?: string;
  penerima?: string;
  jenis: "teks" | "foto" | "suara" | "video";
  isi: string;
  keterangan?: string;
  ukuran_file?: number;
  durasi?: string;
  reaksi?: string; // JSON string { kode: emoji }
  balas_ke?: number;
  deleted: boolean;
  status?: "sent" | "delivered" | "read";
  dibuat_pada: number | string;
}

export interface ChatRoom {
  id: number;
  subserver_id: string;
  peserta_a: string;
  peserta_b: string;
  pesan_terakhir_pada?: number;
  preview_pesan_terakhir?: string;
  belum_dibaca_a: number;
  belum_dibaca_b: number;
}

export interface SyncResponse {
  group_messages: Message[];
  personal_messages: Message[];
  last_timestamp: string;
  server_time: string;
  has_more: boolean;
}

export interface AdminStats {
  total_subservers: number;
  aktif_subservers: number;
  total_anggota: number;
  pesan_hari_ini: number;
}
