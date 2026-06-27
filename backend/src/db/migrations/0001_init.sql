-- Migration: 0001_init
-- SubServer Chat App - Initial Schema

CREATE TABLE IF NOT EXISTS subservers (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  link TEXT NOT NULL UNIQUE,
  kode_utama TEXT NOT NULL UNIQUE,
  max_anggota INTEGER DEFAULT 50,
  expired_at INTEGER,
  aktif INTEGER DEFAULT 1,
  suspended INTEGER DEFAULT 0,
  dibuat_pada INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS contacts (
  kode_anggota TEXT NOT NULL,
  subserver_id TEXT NOT NULL REFERENCES subservers(id),
  nama TEXT NOT NULL,
  foto_profil TEXT,
  ditambahkan_oleh TEXT DEFAULT 'UTAMA',
  aktif INTEGER DEFAULT 1,
  dibuat_pada INTEGER NOT NULL DEFAULT (unixepoch()),
  dihapus_pada INTEGER,
  PRIMARY KEY (kode_anggota, subserver_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_subserver ON contacts(subserver_id);
CREATE INDEX IF NOT EXISTS idx_contacts_aktif ON contacts(aktif);
CREATE INDEX IF NOT EXISTS idx_contacts_kode_sub ON contacts(kode_anggota, subserver_id);

CREATE TABLE IF NOT EXISTS group_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subserver_id TEXT NOT NULL REFERENCES subservers(id),
  pengirim TEXT NOT NULL,
  nama_pengirim TEXT NOT NULL,
  jenis TEXT NOT NULL DEFAULT 'teks',
  isi TEXT NOT NULL,
  keterangan TEXT,
  ukuran_file INTEGER,
  durasi TEXT,
  reaksi TEXT,
  balas_ke INTEGER,
  deleted INTEGER DEFAULT 0,
  dibuat_pada INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_gm_subserver_time ON group_messages(subserver_id, dibuat_pada);
CREATE INDEX IF NOT EXISTS idx_gm_pengirim ON group_messages(pengirim);

CREATE TABLE IF NOT EXISTS personal_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subserver_id TEXT NOT NULL REFERENCES subservers(id),
  pengirim TEXT NOT NULL,
  penerima TEXT NOT NULL,
  jenis TEXT NOT NULL DEFAULT 'teks',
  isi TEXT NOT NULL,
  keterangan TEXT,
  ukuran_file INTEGER,
  durasi TEXT,
  reaksi TEXT,
  status TEXT DEFAULT 'sent',
  balas_ke INTEGER,
  deleted INTEGER DEFAULT 0,
  dibuat_pada INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_pm_subserver_time ON personal_messages(subserver_id, dibuat_pada);
CREATE INDEX IF NOT EXISTS idx_pm_pengirim ON personal_messages(pengirim);
CREATE INDEX IF NOT EXISTS idx_pm_penerima ON personal_messages(penerima);

CREATE TABLE IF NOT EXISTS personal_chat_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subserver_id TEXT NOT NULL REFERENCES subservers(id),
  peserta_a TEXT NOT NULL,
  peserta_b TEXT NOT NULL,
  pesan_terakhir_pada INTEGER,
  preview_pesan_terakhir TEXT,
  belum_dibaca_a INTEGER DEFAULT 0,
  belum_dibaca_b INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pcr_subserver ON personal_chat_rooms(subserver_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subserver_id TEXT,
  aktor TEXT NOT NULL,
  aksi TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  dibuat_pada INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_audit_subserver ON audit_log(subserver_id);
