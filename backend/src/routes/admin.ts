import { Hono } from "hono";
import { eq, count, desc } from "drizzle-orm";
import { getDb } from "../db/connection";
import { subservers, contacts, groupMessages, auditLog } from "../db/schema";
import type { Env, JWTPayload } from "../types";

const admin = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

// ── DASHBOARD STATS ───────────────────────────────────────────
admin.get("/dashboard", async (c) => {
  const db = getDb(c.env);

  const [totalSubservers] = await db.select({ count: count() }).from(subservers);
  const [aktifSubservers] = await db
    .select({ count: count() })
    .from(subservers)
    .where(eq(subservers.aktif, true));
  const [totalAnggota] = await db
    .select({ count: count() })
    .from(contacts)
    .where(eq(contacts.aktif, true));

  // Pesan hari ini
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [pesanHariIni] = await db
    .select({ count: count() })
    .from(groupMessages)
    .where(eq(groupMessages.deleted, false));

  const allSubservers = await db
    .select()
    .from(subservers)
    .orderBy(desc(subservers.dibuat_pada));

  return c.json({
    stats: {
      total_subservers: totalSubservers.count,
      aktif_subservers: aktifSubservers.count,
      total_anggota: totalAnggota.count,
      pesan_hari_ini: pesanHariIni.count,
    },
    subservers: allSubservers,
  });
});

// ── BUAT SUBSERVER ──────────────────────────────────────────
admin.post("/subserver", async (c) => {
  const db = getDb(c.env);
  const body = await c.req.json<{
    nama: string;
    deskripsi?: string;
    max_anggota?: number;
    expired_at?: string;
    link: string;
    kode_utama: string;
  }>();

  const { nama, deskripsi, max_anggota = 50, expired_at, link, kode_utama } = body;

  if (!nama || !link || !kode_utama) {
    return c.json({ error: "nama, link, dan kode_utama wajib diisi" }, 400);
  }
  if (nama.length < 3 || nama.length > 50) {
    return c.json({ error: "Nama harus 3-50 karakter" }, 400);
  }

  // Cek link sudah dipakai?
  const [existingLink] = await db
    .select({ id: subservers.id })
    .from(subservers)
    .where(eq(subservers.link, link))
    .limit(1);
  if (existingLink) return c.json({ error: "Link sudah terpakai" }, 409);

  // Cek kode_utama sudah dipakai?
  const [existingKode] = await db
    .select({ id: subservers.id })
    .from(subservers)
    .where(eq(subservers.kode_utama, kode_utama))
    .limit(1);
  if (existingKode) return c.json({ error: "Kode User Utama sudah terpakai" }, 409);

  const id = crypto.randomUUID();
  await db.insert(subservers).values({
    id,
    nama,
    deskripsi,
    link,
    kode_utama,
    max_anggota,
    expired_at: expired_at ? new Date(expired_at) : undefined,
    aktif: true,
  });

  // Audit log
  await db.insert(auditLog).values({
    subserver_id: id,
    aktor: "admin",
    aksi: "create_subserver",
    detail: JSON.stringify({ nama, link, kode_utama }),
  });

  return c.json({
    success: true,
    id,
    nama,
    link,
    kode_utama,
    message: "SubServer berhasil dibuat",
  }, 201);
});

// ── DAFTAR SUBSERVER ─────────────────────────────────────────
admin.get("/subserver", async (c) => {
  const db = getDb(c.env);
  const all = await db.select().from(subservers).orderBy(desc(subservers.dibuat_pada));
  return c.json({ subservers: all });
});

// ── DETAIL SUBSERVER ─────────────────────────────────────────
admin.get("/subserver/:kode", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("kode");

  const [ss] = await db.select().from(subservers).where(eq(subservers.id, id)).limit(1);
  if (!ss) return c.json({ error: "SubServer tidak ditemukan" }, 404);

  const anggota = await db
    .select()
    .from(contacts)
    .where(eq(contacts.subserver_id, id));

  const [msgCount] = await db
    .select({ count: count() })
    .from(groupMessages)
    .where(eq(groupMessages.subserver_id, id));

  return c.json({ subserver: ss, anggota, stats: { total_pesan: msgCount.count } });
});

// ── UPDATE SUBSERVER ─────────────────────────────────────────
admin.put("/subserver/:id", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("id");
  const body = await c.req.json<Partial<{
    nama: string; deskripsi: string; max_anggota: number; expired_at: string;
  }>>();

  await db.update(subservers)
    .set({
      ...(body.nama && { nama: body.nama }),
      ...(body.deskripsi !== undefined && { deskripsi: body.deskripsi }),
      ...(body.max_anggota && { max_anggota: body.max_anggota }),
      ...(body.expired_at && { expired_at: new Date(body.expired_at) }),
    })
    .where(eq(subservers.id, id));

  return c.json({ success: true });
});

// ── GANTI LINK SUBSERVER ──────────────────────────────────────
admin.put("/subserver/:id/link", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("id");
  const { link } = await c.req.json<{ link: string }>();

  if (!link) return c.json({ error: "Link wajib diisi" }, 400);

  // Cek unik
  const [existing] = await db
    .select({ id: subservers.id })
    .from(subservers)
    .where(eq(subservers.link, link))
    .limit(1);
  if (existing && existing.id !== id) return c.json({ error: "Link sudah terpakai" }, 409);

  await db.update(subservers).set({ link }).where(eq(subservers.id, id));
  return c.json({ success: true, link });
});

// ── GANTI KODE USER UTAMA ─────────────────────────────────────
admin.put("/subserver/:id/kode-utama", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("id");
  const { kode_utama } = await c.req.json<{ kode_utama: string }>();

  if (!kode_utama) return c.json({ error: "Kode wajib diisi" }, 400);

  const [existing] = await db
    .select({ id: subservers.id })
    .from(subservers)
    .where(eq(subservers.kode_utama, kode_utama))
    .limit(1);
  if (existing && existing.id !== id) return c.json({ error: "Kode sudah terpakai" }, 409);

  await db.update(subservers).set({ kode_utama }).where(eq(subservers.id, id));
  return c.json({ success: true, kode_utama });
});

// ── STATUS SUSPEND / AKTIFKAN ─────────────────────────────────
admin.put("/subserver/:id/status", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("id");
  const { suspended } = await c.req.json<{ suspended: boolean }>();

  await db.update(subservers).set({ suspended, aktif: !suspended }).where(eq(subservers.id, id));
  return c.json({ success: true, suspended });
});

// ── HAPUS SUBSERVER ───────────────────────────────────────────
admin.delete("/subserver/:id", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("id");

  await db.delete(subservers).where(eq(subservers.id, id));
  return c.json({ success: true });
});

// ── STATS ─────────────────────────────────────────────────────
admin.get("/stats", async (c) => {
  const db = getDb(c.env);

  const [totalSS] = await db.select({ count: count() }).from(subservers);
  const [aktifSS] = await db
    .select({ count: count() })
    .from(subservers)
    .where(eq(subservers.aktif, true));
  const [totalAnggota] = await db
    .select({ count: count() })
    .from(contacts)
    .where(eq(contacts.aktif, true));
  const [totalMsg] = await db.select({ count: count() }).from(groupMessages);

  return c.json({
    total_subservers: totalSS.count,
    aktif_subservers: aktifSS.count,
    total_anggota: totalAnggota.count,
    total_pesan: totalMsg.count,
  });
});

export default admin;
