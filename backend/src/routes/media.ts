import { Hono } from "hono";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env, JWTPayload } from "../types";

const media = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

function getS3Client(env: Env) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// POST /api/media/upload — dapatkan presigned URL untuk upload langsung ke R2
media.post("/upload", async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{ jenis: string; nama?: string }>();
  const { jenis } = body;

  if (!["foto", "suara", "video", "avatar"].includes(jenis)) {
    return c.json({ error: "Jenis media tidak valid. Gunakan: foto, suara, video, avatar" }, 400);
  }

  const uuid = crypto.randomUUID();
  let key: string;
  let contentType: string;

  switch (jenis) {
    case "foto":
      key = `media/${payload.subserver_id}/foto/${uuid}.webp`;
      contentType = "image/webp";
      break;
    case "suara":
      key = `media/${payload.subserver_id}/suara/${uuid}.opus`;
      contentType = "audio/ogg";
      break;
    case "video":
      key = `media/${payload.subserver_id}/video/${uuid}.mp4`;
      contentType = "video/mp4";
      break;
    case "avatar":
      key = `foto_profil/${payload.subserver_id}/${payload.sub}.webp`;
      contentType = "image/webp";
      break;
    default:
      key = `media/${payload.subserver_id}/file/${uuid}`;
      contentType = "application/octet-stream";
  }

  const s3 = getS3Client(c.env);
  const bucketName = c.env.R2_BUCKET_NAME || "subserver-media";
  const publicUrl = c.env.R2_PUBLIC_URL
    ? `${c.env.R2_PUBLIC_URL}/${key}`
    : `https://${bucketName}.${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 menit

  return c.json({ upload_url: uploadUrl, file_url: publicUrl, key });
});

// GET /api/media/:key — download / stream media (untuk media yang tidak public)
media.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const payload = c.get("jwtPayload");

  // Pastikan user hanya bisa akses media SubServer-nya sendiri
  if (!key.includes(`/${payload.subserver_id}/`) && !key.includes(`/${payload.sub}.`)) {
    return c.json({ error: "Akses ditolak" }, 403);
  }

  const s3 = getS3Client(c.env);
  const bucketName = c.env.R2_BUCKET_NAME || "subserver-media";

  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 jam

  return c.redirect(signedUrl, 302);
});

// POST /api/media/foto-profil — upload foto profil (alias ke upload dengan jenis=avatar)
media.post("/foto-profil", async (c) => {
  const payload = c.get("jwtPayload");
  const s3 = getS3Client(c.env);
  const bucketName = c.env.R2_BUCKET_NAME || "subserver-media";
  const key = `foto_profil/${payload.subserver_id}/${payload.sub}.webp`;
  const publicUrl = c.env.R2_PUBLIC_URL
    ? `${c.env.R2_PUBLIC_URL}/${key}`
    : `https://${bucketName}.${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: "image/webp",
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return c.json({ upload_url: uploadUrl, file_url: publicUrl, key });
});

export default media;
