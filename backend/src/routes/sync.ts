import { Hono } from "hono";
import { eq, and, gt, or, asc } from "drizzle-orm";
import { getDb } from "../db/connection";
import { groupMessages, personalMessages, contacts } from "../db/schema";
import type { Env, JWTPayload } from "../types";

const sync = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

// GET /api/sync — Smart Polling endpoint utama
// Mengembalikan semua data baru sejak last_timestamp:
// - pesan grup baru
// - pesan DM baru (untuk user ini)
// - status anggota online (via timestamp kehadiran di KV)
sync.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const lastTimestamp = c.req.query("last_timestamp");
  const db = getDb(c.env);

  const since = lastTimestamp ? new Date(lastTimestamp) : new Date(Date.now() - 60000); // default 1 menit lalu

  // ── Pesan Grup Baru ─────────────────────────────────────
  const newGroupMessages = await db
    .select()
    .from(groupMessages)
    .where(
      and(
        eq(groupMessages.subserver_id, payload.subserver_id),
        gt(groupMessages.dibuat_pada, since)
      )
    )
    .orderBy(asc(groupMessages.dibuat_pada))
    .limit(50);

  // ── Pesan DM Baru (dikirim atau diterima user ini) ───────
  const newPersonalMessages = await db
    .select()
    .from(personalMessages)
    .where(
      and(
        eq(personalMessages.subserver_id, payload.subserver_id),
        gt(personalMessages.dibuat_pada, since),
        or(
          eq(personalMessages.pengirim, payload.sub),
          eq(personalMessages.penerima, payload.sub)
        )
      )
    )
    .orderBy(asc(personalMessages.dibuat_pada))
    .limit(50);

  // ── Update kehadiran user di KV ──────────────────────────
  const presenceKey = `presence:${payload.subserver_id}:${payload.sub}`;
  await c.env.RATE_LIMIT_KV.put(
    presenceKey,
    JSON.stringify({ kode: payload.sub, nama: payload.name, online: true, waktu: new Date().toISOString() }),
    { expirationTtl: 30 } // expire 30 detik = dianggap offline
  );

  // ── Ambil daftar anggota online ──────────────────────────
  // (KV list prefix) - simplified: return timestamp saja
  const now = new Date().toISOString();

  const allTimestamps = [
    ...newGroupMessages.map(m => m.dibuat_pada),
    ...newPersonalMessages.map(m => m.dibuat_pada),
  ].filter(Boolean) as Date[];

  const lastTs = allTimestamps.length > 0
    ? new Date(Math.max(...allTimestamps.map(d => d.getTime()))).toISOString()
    : lastTimestamp || now;

  return c.json({
    group_messages: newGroupMessages,
    personal_messages: newPersonalMessages,
    last_timestamp: lastTs,
    server_time: now,
    has_more: newGroupMessages.length === 50 || newPersonalMessages.length === 50,
  });
});

// POST /api/sync/typing — indikator mengetik (via KV, TTL 5 detik)
sync.post("/typing", async (c) => {
  const payload = c.get("jwtPayload");
  const { sedang_mengetik, penerima } = await c.req.json<{
    sedang_mengetik: boolean;
    penerima?: string; // null = grup
  }>();

  const key = penerima
    ? `typing:${payload.subserver_id}:dm:${[payload.sub, penerima].sort().join(":")}`
    : `typing:${payload.subserver_id}:grup:${payload.sub}`;

  if (sedang_mengetik) {
    await c.env.RATE_LIMIT_KV.put(
      key,
      JSON.stringify({ kode: payload.sub, nama: payload.name, penerima }),
      { expirationTtl: 5 }
    );
  } else {
    await c.env.RATE_LIMIT_KV.delete(key);
  }

  return c.json({ success: true });
});

export default sync;
