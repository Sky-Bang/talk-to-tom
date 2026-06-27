export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  RATE_LIMIT_KV: KVNamespace;
  JWT_SECRET: string;
  ADMIN_CODE: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  FRONTEND_URL: string;
  APP_NAME: string;
}

export interface JWTPayload {
  sub: string;           // kode_anggota atau kode_utama
  role: "admin" | "utama" | "anggota";
  subserver_id: string;
  name: string;
  link?: string;
  iat: number;
  exp: number;
}

export interface SyncMessage {
  id: number;
  pengirim: string;
  nama_pengirim: string;
  jenis: string;
  isi: string;
  keterangan: string | null;
  reaksi: string | null;
  balas_ke: number | null;
  deleted: boolean;
  waktu: string;
  tipe_chat: "grup" | "personal";
  penerima?: string;
}
