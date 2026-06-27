import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db/connection";
import { contacts, subservers, auditLog } from "../db/schema";
import type { Env, JWTPayload } from "../types";

const membership = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

// GET /api/subserver/anggota — daftar anggota
membership.get("/anggota", async (c) => {
  const payload = c.get("jwtPayload");
  const db = getDb(c.env);

  const anggota = await db
    .select()
    .from(contacts)
    .where(eq(contacts.subserver_id, payload.subserver_id));

  return c.json({ anggota });
});

// POST /api/subserver/anggota — tambah anggota (manual)
membership.post("/anggota", async (c) => {
  const payload = c.get("jwtPayload");
  if (payload.role !== "utama") return c.json({ error: "Hanya User Utama yang bisa tambah anggota" }, 403);

  const db = getDb(c.env);
  const body = await c.req.json<{ nama: string; kode_anggota: string }>();
  const { nama, kode_anggota } = body;

  if (!nama || !kode_anggota) {
    return c.json({ error: "nama dan kode_anggota wajib diisi" }, 400);
  }
  if (nama.length < 1 || nama.length > 50) {
    return c.json({ error: "Nama harus 1-50 karakter" }, 400);
  }

  // Cek SubServer - berapa max anggota?
  const [ss] = await db
    .select({ max_anggota: subservers.max_anggota })
    .from(subservers)
    .where(eq(subservers.id, payload.subserver_id))
    .limit(1);

  // Cek jumlah anggota aktif saat ini
  const aktifAnggota = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.subserver_id, payload.subserver_id),
        eq(contacts.aktif, true)
      )
    );

  if (ss && aktifAnggota.length >= (ss.max_anggota || 50)) {
    return c.json({ error: `Batas maksimal anggota (${ss.max_anggota}) sudah tercapai` }, 400);
  }

  // Cek kode sudah dipakai di SubServer ini?
  const [existing] = await db
    .select({ kode_anggota: contacts.kode_anggota })
    .from(contacts)
    .where(
      and(
        eq(contacts.kode_anggota, kode_anggota.toUpperCase()),
        eq(contacts.subserver_id, payload.subserver_id)
      )
    )
    .limit(1);

  if (existing) return c.json({ error: "Kode sudah terpakai di SubServer ini" }, 409);

  await db.insert(contacts).values({
    kode_anggota: kode_anggota.toUpperCase(),
    subserver_id: payload.subserver_id,
    nama,
    ditambahkan_oleh: payload.sub,
    aktif: true,
  });

  // Audit
  await db.insert(auditLog).values({
    subserver_id: payload.subserver_id,
    aktor: payload.sub,
    aksi: "add_member",
    detail: JSON.stringify({ nama, kode_anggota }),
  });

  return c.json({
    success: true,
    kode_anggota: kode_anggota.toUpperCase(),
    nama,
    message: "Anggota berhasil ditambahkan",
  }, 201);
});

// DELETE /api/subserver/anggota/:kode — hapus anggota (soft)
membership.delete("/anggota/:kode", async (c) => {
  const payload = c.get("jwtPayload");
  if (payload.role !== "utama") return c.json({ error: "Hanya User Utama" }, 403);

  const kode = c.req.param("kode").toUpperCase();
  const db = getDb(c.env);

  const [anggota] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.kode_anggota, kode),
        eq(contacts.subserver_id, payload.subserver_id)
      )
    )
    .limit(1);

  if (!anggota) return c.json({ error: "Anggota tidak ditemukan" }, 404);

  // Soft delete
  await db
    .update(contacts)
    .set({ aktif: false, dihapus_pada: new Date() })
    .where(
      and(
        eq(contacts.kode_anggota, kode),
        eq(contacts.subserver_id, payload.subserver_id)
      )
    );

  await db.insert(auditLog).values({
    subserver_id: payload.subserver_id,
    aktor: payload.sub,
    aksi: "delete_member",
    detail: JSON.stringify({ kode_anggota: kode }),
  });

  return c.json({ success: true, message: "Anggota dinonaktifkan selama 7 hari" });
});

// POST /api/subserver/anggota/:kode/reset — ganti kode anggota
membership.post("/anggota/:kode/reset", async (c) => {
  const payload = c.get("jwtPayload");
  if (payload.role !== "utama") return c.json({ error: "Hanya User Utama" }, 403);

  const kode_lama = c.req.param("kode").toUpperCase();
  const { kode_baru } = await c.req.json<{ kode_baru: string }>();

  if (!kode_baru) return c.json({ error: "kode_baru wajib diisi" }, 400);

  const db = getDb(c.env);

  // Cek kode_baru sudah dipakai?
  const [existing] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.kode_anggota, kode_baru.toUpperCase()),
        eq(contacts.subserver_id, payload.subserver_id)
      )
    )
    .limit(1);

  if (existing) return c.json({ error: "Kode baru sudah terpakai" }, 409);

  // Update kode
  await db
    .update(contacts)
    .set({ kode_anggota: kode_baru.toUpperCase() })
    .where(
      and(
        eq(contacts.kode_anggota, kode_lama),
        eq(contacts.subserver_id, payload.subserver_id)
      )
    );

  return c.json({
    success: true,
    kode_lama,
    kode_baru: kode_baru.toUpperCase(),
    message: "Kode diganti. Anggota harus login ulang.",
  });
});

// GET /api/subserver/info — info SubServer
membership.get("/info", async (c) => {
  const payload = c.get("jwtPayload");
  const db = getDb(c.env);

  const [ss] = await db
    .select()
    .from(subservers)
    .where(eq(subservers.id, payload.subserver_id))
    .limit(1);

  if (!ss) return c.json({ error: "SubServer tidak ditemukan" }, 404);

  return c.json({ subserver: ss });
});

export default membership;
