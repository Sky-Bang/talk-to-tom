import { drizzle } from "drizzle-orm/d1";
import { lt, and, eq, ne } from "drizzle-orm";
import { groupMessages, personalMessages, contacts } from "../db/schema";
import type { Env } from "../types";

export async function handleCron(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const now = Date.now();

  // 1. Hapus pesan teks grup > 48 jam
  const cutoff48h = new Date(now - 48 * 60 * 60 * 1000);
  await db
    .delete(groupMessages)
    .where(
      and(
        eq(groupMessages.jenis, "teks"),
        lt(groupMessages.dibuat_pada, cutoff48h)
      )
    );

  // 2. Hapus media grup > 24 jam (ambil URL R2 dulu)
  const cutoff24h = new Date(now - 24 * 60 * 60 * 1000);
  const oldGroupMedia = await db
    .select({ id: groupMessages.id, isi: groupMessages.isi })
    .from(groupMessages)
    .where(
      and(
        ne(groupMessages.jenis, "teks"),
        lt(groupMessages.dibuat_pada, cutoff24h)
      )
    );

  for (const msg of oldGroupMedia) {
    try {
      // Hapus dari R2 (isi = path di R2)
      const key = msg.isi.replace(/^https?:\/\/[^/]+\//, "");
      await env.MEDIA_BUCKET.delete(key);
    } catch {
      // Lanjut walau R2 gagal
    }
  }

  if (oldGroupMedia.length > 0) {
    await db
      .delete(groupMessages)
      .where(
        and(
          ne(groupMessages.jenis, "teks"),
          lt(groupMessages.dibuat_pada, cutoff24h)
        )
      );
  }

  // 3. Hapus media personal > 24 jam
  const oldPersonalMedia = await db
    .select({ id: personalMessages.id, isi: personalMessages.isi })
    .from(personalMessages)
    .where(
      and(
        ne(personalMessages.jenis, "teks"),
        lt(personalMessages.dibuat_pada, cutoff24h)
      )
    );

  for (const msg of oldPersonalMedia) {
    try {
      const key = msg.isi.replace(/^https?:\/\/[^/]+\//, "");
      await env.MEDIA_BUCKET.delete(key);
    } catch {
      // Lanjut
    }
  }

  if (oldPersonalMedia.length > 0) {
    await db
      .delete(personalMessages)
      .where(
        and(
          ne(personalMessages.jenis, "teks"),
          lt(personalMessages.dibuat_pada, cutoff24h)
        )
      );
  }

  // 4. Hapus pesan personal teks > 48 jam
  await db
    .delete(personalMessages)
    .where(
      and(
        eq(personalMessages.jenis, "teks"),
        lt(personalMessages.dibuat_pada, cutoff48h)
      )
    );

  // 5. Hard delete anggota yang di-soft-delete > 7 hari
  const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  await db
    .delete(contacts)
    .where(
      and(
        eq(contacts.aktif, false),
        lt(contacts.dihapus_pada, cutoff7d)
      )
    );
}
