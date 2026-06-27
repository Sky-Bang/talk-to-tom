import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db/connection";
import { subservers, contacts } from "../db/schema";
import { signJWT, verifyJWT } from "../utils/jwt";
import { checkRateLimit } from "../utils/rateLimit";
import type { Env, JWTPayload } from "../types";

const auth = new Hono<{ Bindings: Env }>();

// POST /api/auth/validasi — cek kode dan buat JWT
auth.post("/validasi", async (c) => {
  const ip = c.req.header("CF-Connecting-IP") || "unknown";

  // Rate limit: 5 kali per 15 menit per IP
  const rl = await checkRateLimit(c.env, ip, 5, 900);
  if (!rl.allowed) {
    return c.json({ error: "Terlalu banyak percobaan. Coba lagi nanti.", retryAfter: rl.retryAfter }, 429);
  }

  const body = await c.req.json<{ kode: string; subserver_link?: string }>();
  const kode = (body.kode || "").trim().toUpperCase();
  const link = (body.subserver_link || "").trim();

  if (!kode) {
    return c.json({ error: "Kode tidak boleh kosong" }, 400);
  }

  const db = getDb(c.env);

  // ── ADMIN ────────────────────────────────────────────
  if (c.env.ADMIN_CODE && kode === c.env.ADMIN_CODE) {
    const token = await signJWT(
      { sub: "admin", role: "admin", subserver_id: "pusat", name: "Admin" },
      c.env.JWT_SECRET
    );
    setCookie(c, "auth_token", token, {
      httpOnly: true, secure: true, sameSite: "Strict",
      maxAge: 24 * 60 * 60, path: "/",
    });
    return c.json({ success: true, role: "admin", name: "Admin", redirect: "/admin/dashboard" });
  }

  // ── USER UTAMA ────────────────────────────────────────
  const [subserver] = await db
    .select()
    .from(subservers)
    .where(eq(subservers.kode_utama, kode))
    .limit(1);

  if (subserver) {
    if (subserver.suspended) return c.json({ error: "SubServer ini di-suspend" }, 403);
    if (subserver.expired_at && subserver.expired_at < new Date()) {
      return c.json({ error: "SubServer telah expired" }, 403);
    }
    const token = await signJWT(
      {
        sub: kode,
        role: "utama",
        subserver_id: subserver.id,
        name: "User Utama",
        link: subserver.link,
      },
      c.env.JWT_SECRET
    );
    setCookie(c, "auth_token", token, {
      httpOnly: true, secure: true, sameSite: "Strict",
      maxAge: 24 * 60 * 60, path: "/",
    });
    return c.json({
      success: true,
      role: "utama",
      name: "User Utama",
      subserver_id: subserver.id,
      subserver_nama: subserver.nama,
      subserver_link: subserver.link,
      redirect: `/${subserver.link}/grup`,
    });
  }

  // ── ANGGOTA ───────────────────────────────────────────
  // Cari berdasarkan kode + link SubServer (wajib disertakan)
  let targetSubserver: typeof subservers.$inferSelect | undefined;

  if (link) {
    const [ss] = await db
      .select()
      .from(subservers)
      .where(eq(subservers.link, link))
      .limit(1);
    targetSubserver = ss;
  }

  if (!targetSubserver) {
    return c.json({ error: "Kode atau link tidak valid" }, 401);
  }

  if (targetSubserver.suspended) return c.json({ error: "SubServer ini di-suspend" }, 403);
  if (targetSubserver.expired_at && targetSubserver.expired_at < new Date()) {
    return c.json({ error: "SubServer telah expired" }, 403);
  }

  const [contact] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.kode_anggota, kode),
        eq(contacts.subserver_id, targetSubserver.id),
        eq(contacts.aktif, true)
      )
    )
    .limit(1);

  if (!contact) {
    return c.json({ error: "Kode tidak valid atau tidak aktif" }, 401);
  }

  const token = await signJWT(
    {
      sub: kode,
      role: "anggota",
      subserver_id: targetSubserver.id,
      name: contact.nama,
      link: targetSubserver.link,
    },
    c.env.JWT_SECRET
  );
  setCookie(c, "auth_token", token, {
    httpOnly: true, secure: true, sameSite: "Strict",
    maxAge: 24 * 60 * 60, path: "/",
  });
  return c.json({
    success: true,
    role: "anggota",
    name: contact.nama,
    subserver_id: targetSubserver.id,
    subserver_nama: targetSubserver.nama,
    subserver_link: targetSubserver.link,
    redirect: `/${targetSubserver.link}/grup`,
  });
});

// GET /api/auth/sesi — cek sesi aktif
auth.get("/sesi", async (c) => {
  const token = getCookie(c, "auth_token");
  if (!token) return c.json({ authenticated: false }, 401);
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    return c.json({ authenticated: true, payload });
  } catch {
    return c.json({ authenticated: false }, 401);
  }
});

// POST /api/auth/keluar — hapus sesi
auth.post("/keluar", (c) => {
  deleteCookie(c, "auth_token", { path: "/" });
  return c.json({ success: true });
});

// POST /api/auth/refresh — perbarui JWT
auth.post("/refresh", async (c) => {
  const token = getCookie(c, "auth_token");
  if (!token) return c.json({ error: "No session" }, 401);
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    const newToken = await signJWT(
      { sub: payload.sub, role: payload.role, subserver_id: payload.subserver_id, name: payload.name, link: payload.link },
      c.env.JWT_SECRET
    );
    setCookie(c, "auth_token", newToken, {
      httpOnly: true, secure: true, sameSite: "Strict",
      maxAge: 24 * 60 * 60, path: "/",
    });
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

export default auth;
