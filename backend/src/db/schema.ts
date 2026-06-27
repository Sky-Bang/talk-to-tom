import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// ============================================================
// SUBSERVERS
// ============================================================
export const subservers = sqliteTable("subservers", {
  id: text("id").primaryKey(), // generated uuid
  nama: text("nama").notNull(),
  deskripsi: text("deskripsi"),
  link: text("link").notNull().unique(), // manual bebas dari Admin
  kode_utama: text("kode_utama").notNull().unique(), // manual bebas dari Admin
  max_anggota: integer("max_anggota").default(50),
  expired_at: integer("expired_at", { mode: "timestamp" }),
  aktif: integer("aktif", { mode: "boolean" }).default(true),
  suspended: integer("suspended", { mode: "boolean" }).default(false),
  dibuat_pada: integer("dibuat_pada", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ============================================================
// CONTACTS (anggota per SubServer)
// ============================================================
export const contacts = sqliteTable("contacts", {
  kode_anggota: text("kode_anggota").notNull(), // manual bebas dari User Utama
  subserver_id: text("subserver_id").notNull().references(() => subservers.id),
  nama: text("nama").notNull(),
  foto_profil: text("foto_profil"),
  ditambahkan_oleh: text("ditambahkan_oleh").default("UTAMA"),
  aktif: integer("aktif", { mode: "boolean" }).default(true),
  dibuat_pada: integer("dibuat_pada", { mode: "timestamp" }).$defaultFn(() => new Date()),
  dihapus_pada: integer("dihapus_pada", { mode: "timestamp" }),
}, (table) => ({
  idxContactsSubserver: index("idx_contacts_subserver").on(table.subserver_id),
  idxContactsAktif: index("idx_contacts_aktif").on(table.aktif),
  idxContactsKodeSub: index("idx_contacts_kode_sub").on(table.kode_anggota, table.subserver_id),
}));

// ============================================================
// GROUP MESSAGES
// ============================================================
export const groupMessages = sqliteTable("group_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subserver_id: text("subserver_id").notNull().references(() => subservers.id),
  pengirim: text("pengirim").notNull(),
  nama_pengirim: text("nama_pengirim").notNull(),
  jenis: text("jenis").notNull().default("teks"), // teks | foto | suara | video
  isi: text("isi").notNull(),
  keterangan: text("keterangan"),
  ukuran_file: integer("ukuran_file"),
  durasi: text("durasi"),
  reaksi: text("reaksi"), // JSON string
  balas_ke: integer("balas_ke"), // id pesan yang dibalas
  deleted: integer("deleted", { mode: "boolean" }).default(false),
  dibuat_pada: integer("dibuat_pada", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  idxGmSubserverTime: index("idx_gm_subserver_time").on(table.subserver_id, table.dibuat_pada),
  idxGmPengirim: index("idx_gm_pengirim").on(table.pengirim),
}));

// ============================================================
// PERSONAL MESSAGES
// ============================================================
export const personalMessages = sqliteTable("personal_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subserver_id: text("subserver_id").notNull().references(() => subservers.id),
  pengirim: text("pengirim").notNull(),
  penerima: text("penerima").notNull(),
  jenis: text("jenis").notNull().default("teks"),
  isi: text("isi").notNull(),
  keterangan: text("keterangan"),
  ukuran_file: integer("ukuran_file"),
  durasi: text("durasi"),
  reaksi: text("reaksi"),
  status: text("status").default("sent"), // sent | delivered | read
  balas_ke: integer("balas_ke"),
  deleted: integer("deleted", { mode: "boolean" }).default(false),
  dibuat_pada: integer("dibuat_pada", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  idxPmSubserverTime: index("idx_pm_subserver_time").on(table.subserver_id, table.dibuat_pada),
  idxPmPengirim: index("idx_pm_pengirim").on(table.pengirim),
  idxPmPenerima: index("idx_pm_penerima").on(table.penerima),
  idxPmConversation: index("idx_pm_conversation").on(table.pengirim, table.penerima),
}));

// ============================================================
// PERSONAL CHAT ROOMS
// ============================================================
export const personalChatRooms = sqliteTable("personal_chat_rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subserver_id: text("subserver_id").notNull().references(() => subservers.id),
  peserta_a: text("peserta_a").notNull(),
  peserta_b: text("peserta_b").notNull(),
  pesan_terakhir_pada: integer("pesan_terakhir_pada", { mode: "timestamp" }),
  preview_pesan_terakhir: text("preview_pesan_terakhir"),
  belum_dibaca_a: integer("belum_dibaca_a").default(0),
  belum_dibaca_b: integer("belum_dibaca_b").default(0),
}, (table) => ({
  idxPcrSubserver: index("idx_pcr_subserver").on(table.subserver_id),
  idxPcrPesertaA: index("idx_pcr_peserta_a").on(table.peserta_a),
  idxPcrPesertaB: index("idx_pcr_peserta_b").on(table.peserta_b),
}));

// ============================================================
// TYPING INDICATORS (in-memory only, stored briefly in KV)
// ============================================================
// Not in DB - handled by KV with short TTL

// ============================================================
// AUDIT LOG
// ============================================================
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subserver_id: text("subserver_id"),
  aktor: text("aktor").notNull(),
  aksi: text("aksi").notNull(),
  detail: text("detail"),
  ip: text("ip"),
  dibuat_pada: integer("dibuat_pada", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  idxAuditSubserver: index("idx_audit_subserver").on(table.subserver_id),
  idxAuditAktor: index("idx_audit_aktor").on(table.aktor),
}));
