import { Hono } from "hono";
import { eq, and, or, desc, gt, lt, asc } from "drizzle-orm";
import { getDb } from "../db/connection";
import {
  groupMessages,
  personalMessages,
  personalChatRooms,
  contacts,
  auditLog,
} from "../db/schema";
import type { Env, JWTPayload } from "../types";

const chat = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

// ── RIWAYAT GRUP ────────────────────────────────────────────
chat.get("/grup/riwayat", async (c) => {
  const payload = c.get("jwtPayload");
  const db = getDb(c.env);
  // "before" = fetch messages older than this id (cursor-based, load older messages)
  const before = c.req.query("before");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);

  const messages = await db
    .select()
    .from(groupMessages)
    .where(
      and(
        eq(groupMessages.subserver_id, payload.subserver_id),
        eq(groupMessages.deleted, false),
        ...(before ? [lt(groupMessages.id, parseInt(before))] : [])
      )
    )
    .orderBy(desc(groupMessages.id))
    .limit(limit);

  // Return in chronological order
  return c.json({ messages: messages.reverse(), has_more: messages.length === limit });
});

// ── KIRIM PESAN GRUP ────────────────────────────────────────
chat.post("/grup/pesan", async (c) => {
  const payload = c.get("jwtPayload");
  const db = getDb(c.env);

  const body = await c.req.json<{
    jenis: string;
    isi: string;
    keterangan?: string;
    ukuran_file?: number;
    durasi?: string;
    balas_ke?: number;
  }>();

  if (!body.isi) return c.json({ error: "Isi pesan tidak boleh kosong" }, 400);

  const jenis = body.jenis || "teks";
  const validJenis = ["teks", "foto", "suara", "video"];
  if (!validJenis.includes(jenis)) return c.json({ error: "Jenis tidak valid" }, 400);

  const [inserted] = await db
    .insert(groupMessages)
    .values({
      subserver_id: payload.subserver_id,
      pengirim: payload.sub,
      nama_pengirim: payload.name,
      jenis,
      isi: body.isi,
      keterangan: body.keterangan,
      ukuran_file: body.ukuran_file,
      durasi: body.durasi,
      balas_ke: body.balas_ke,
    })
    .returning();

  return c.json({ success: true, message: inserted }, 201);
});

// ── SYNC GRUP (Smart Polling) ───────────────────────────────
chat.get("/grup/sync", async (c) => {
  const payload = c.get("jwtPayload");
  const lastTimestamp = c.req.query("last_timestamp");
  const db = getDb(c.env);

  const conditions = [
    eq(groupMessages.subserver_id, payload.subserver_id),
    eq(groupMessages.deleted, false),
  ];

  if (lastTimestamp) {
    conditions.push(gt(groupMessages.dibuat_pada, new Date(lastTimestamp)));
  }

  const messages = await db
    .select()
    .from(groupMessages)
    .where(and(...conditions))
    .orderBy(asc(groupMessages.dibuat_pada))
    .limit(50);

  const last = messages.length > 0
    ? messages[messages.length - 1].dibuat_pada?.toISOString()
    : lastTimestamp;

  return c.json({
    data: messages,
    last_timestamp: last,
    has_more: messages.length === 50,
  });
});

// ── RIWAYAT DM ──────────────────────────────────────────────
chat.get("/personal/riwayat", async (c) => {
  const payload = c.get("jwtPayload");
  const penerima = c.req.query("penerima");
  const db = getDb(c.env);

  if (!penerima) return c.json({ error: "penerima wajib" }, 400);

  const messages = await db
    .select()
    .from(personalMessages)
    .where(
      and(
        eq(personalMessages.subserver_id, payload.subserver_id),
        eq(personalMessages.deleted, false),
        or(
          and(
            eq(personalMessages.pengirim, payload.sub),
            eq(personalMessages.penerima, penerima)
          ),
          and(
            eq(personalMessages.pengirim, penerima),
            eq(personalMessages.penerima, payload.sub)
          )
        )
      )
    )
    .orderBy(desc(personalMessages.dibuat_pada))
    .limit(50);

  return c.json({ messages: messages.reverse() });
});

// ── KIRIM PESAN DM ──────────────────────────────────────────
chat.post("/personal/pesan", async (c) => {
  const payload = c.get("jwtPayload");
  const db = getDb(c.env);

  const body = await c.req.json<{
    penerima: string;
    jenis: string;
    isi: string;
    keterangan?: string;
    ukuran_file?: number;
    durasi?: string;
    balas_ke?: number;
  }>();

  if (!body.penerima || !body.isi) {
    return c.json({ error: "penerima dan isi wajib diisi" }, 400);
  }

  // Pastikan penerima ada di SubServer ini
  const [anggotaPenerima] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.kode_anggota, body.penerima),
        eq(contacts.subserver_id, payload.subserver_id),
        eq(contacts.aktif, true)
      )
    )
    .limit(1);

  // User Utama boleh DM siapapun tanpa cek
  if (!anggotaPenerima && payload.role === "anggota") {
    return c.json({ error: "Penerima tidak ditemukan" }, 404);
  }

  const [inserted] = await db
    .insert(personalMessages)
    .values({
      subserver_id: payload.subserver_id,
      pengirim: payload.sub,
      penerima: body.penerima,
      jenis: body.jenis || "teks",
      isi: body.isi,
      keterangan: body.keterangan,
      ukuran_file: body.ukuran_file,
      durasi: body.durasi,
      balas_ke: body.balas_ke,
      status: "sent",
    })
    .returning();

  // Update/insert chat room
  const pesertaA = [payload.sub, body.penerima].sort()[0];
  const pesertaB = [payload.sub, body.penerima].sort()[1];

  const [existingRoom] = await db
    .select()
    .from(personalChatRooms)
    .where(
      and(
        eq(personalChatRooms.subserver_id, payload.subserver_id),
        eq(personalChatRooms.peserta_a, pesertaA),
        eq(personalChatRooms.peserta_b, pesertaB)
      )
    )
    .limit(1);

  const preview = body.jenis !== "teks" ? `[${body.jenis}]` : body.isi.slice(0, 50);

  if (existingRoom) {
    const isA = payload.sub === pesertaA;
    await db
      .update(personalChatRooms)
      .set({
        pesan_terakhir_pada: new Date(),
        preview_pesan_terakhir: preview,
        belum_dibaca_a: isA ? existingRoom.belum_dibaca_a || 0 : (existingRoom.belum_dibaca_a || 0) + 1,
        belum_dibaca_b: !isA ? existingRoom.belum_dibaca_b || 0 : (existingRoom.belum_dibaca_b || 0) + 1,
      })
      .where(eq(personalChatRooms.id, existingRoom.id));
  } else {
    await db.insert(personalChatRooms).values({
      subserver_id: payload.subserver_id,
      peserta_a: pesertaA,
      peserta_b: pesertaB,
      pesan_terakhir_pada: new Date(),
      preview_pesan_terakhir: preview,
      belum_dibaca_a: payload.sub === pesertaA ? 0 : 1,
      belum_dibaca_b: payload.sub === pesertaB ? 0 : 1,
    });
  }

  return c.json({ success: true, message: inserted }, 201);
});

// ── SYNC DM (Smart Polling) ─────────────────────────────────
chat.get("/personal/sync", async (c) => {
  const payload = c.get("jwtPayload");
  const penerima = c.req.query("penerima");
  const lastTimestamp = c.req.query("last_timestamp");
  const db = getDb(c.env);

  if (!penerima) return c.json({ error: "penerima wajib" }, 400);

  const conditions = [
    eq(personalMessages.subserver_id, payload.subserver_id),
    eq(personalMessages.deleted, false),
    or(
      and(eq(personalMessages.pengirim, payload.sub), eq(personalMessages.penerima, penerima)),
      and(eq(personalMessages.pengirim, penerima), eq(personalMessages.penerima, payload.sub))
    ),
    ...(lastTimestamp ? [gt(personalMessages.dibuat_pada, new Date(lastTimestamp))] : []),
  ];

  const messages = await db
    .select()
    .from(personalMessages)
    .where(and(...conditions))
    .orderBy(asc(personalMessages.dibuat_pada))
    .limit(50);

  const last = messages.length > 0
    ? messages[messages.length - 1].dibuat_pada?.toISOString()
    : lastTimestamp;

  return c.json({ data: messages, last_timestamp: last, has_more: messages.length === 50 });
});

// ── DAFTAR RUANG CHAT PERSONAL ──────────────────────────────
chat.get("/personal/ruang", async (c) => {
  const payload = c.get("jwtPayload");
  const db = getDb(c.env);

  const rooms = await db
    .select()
    .from(personalChatRooms)
    .where(
      and(
        eq(personalChatRooms.subserver_id, payload.subserver_id),
        or(
          eq(personalChatRooms.peserta_a, payload.sub),
          eq(personalChatRooms.peserta_b, payload.sub)
        )
      )
    )
    .orderBy(desc(personalChatRooms.pesan_terakhir_pada));

  return c.json({ rooms });
});

// ── TANDAI DIBACA ───────────────────────────────────────────
chat.post("/dibaca", async (c) => {
  const payload = c.get("jwtPayload");
  const db = getDb(c.env);
  const { id_pesan, tipe } = await c.req.json<{ id_pesan: number; tipe: "grup" | "personal" }>();

  if (tipe === "personal") {
    await db
      .update(personalMessages)
      .set({ status: "read" })
      .where(
        and(
          eq(personalMessages.id, id_pesan),
          eq(personalMessages.penerima, payload.sub),
          eq(personalMessages.subserver_id, payload.subserver_id) // prevent IDOR
        )
      );
  }

  return c.json({ success: true });
});

// ── REAKSI PESAN ────────────────────────────────────────────
chat.post("/reaksi", async (c) => {
  const payload = c.get("jwtPayload");
  const db = getDb(c.env);
  const { id_pesan, emoji, tipe } = await c.req.json<{
    id_pesan: number; emoji: string; tipe: "grup" | "personal";
  }>();

  if (tipe === "grup") {
    const [msg] = await db
      .select({ reaksi: groupMessages.reaksi })
      .from(groupMessages)
      .where(eq(groupMessages.id, id_pesan))
      .limit(1);

    const reaksiObj = msg?.reaksi ? JSON.parse(msg.reaksi) : {};
    if (reaksiObj[payload.sub] === emoji) {
      delete reaksiObj[payload.sub]; // toggle off
    } else {
      reaksiObj[payload.sub] = emoji;
    }

    await db
      .update(groupMessages)
      .set({ reaksi: JSON.stringify(reaksiObj) })
      .where(eq(groupMessages.id, id_pesan));
  }

  return c.json({ success: true });
});

// ── HAPUS PESAN ─────────────────────────────────────────────
chat.post("/hapus", async (c) => {
  const payload = c.get("jwtPayload");
  const db = getDb(c.env);
  const { id_pesan, tipe, cakupan } = await c.req.json<{
    id_pesan: number; tipe: "grup" | "personal"; cakupan: "semua" | "sendiri";
  }>();

  if (tipe === "grup") {
    const [msg] = await db
      .select({ pengirim: groupMessages.pengirim })
      .from(groupMessages)
      .where(
        and(
          eq(groupMessages.id, id_pesan),
          eq(groupMessages.subserver_id, payload.subserver_id) // prevent IDOR
        )
      )
      .limit(1);

    if (!msg) return c.json({ error: "Pesan tidak ditemukan" }, 404);
    if (msg.pengirim !== payload.sub && payload.role !== "utama") {
      return c.json({ error: "Tidak bisa hapus pesan orang lain" }, 403);
    }

    await db
      .update(groupMessages)
      .set({ deleted: true, isi: "Pesan telah dihapus" })
      .where(
        and(
          eq(groupMessages.id, id_pesan),
          eq(groupMessages.subserver_id, payload.subserver_id)
        )
      );
  }

  return c.json({ success: true });
});

export default chat;
