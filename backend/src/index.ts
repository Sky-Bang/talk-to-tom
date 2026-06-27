import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import membershipRoutes from "./routes/membership";
import chatRoutes from "./routes/chat";
import mediaRoutes from "./routes/media";
import syncRoutes from "./routes/sync";
import { verifyJWT } from "./utils/jwt";
import { handleCron } from "./utils/cronCleanup";
import type { Env, JWTPayload } from "./types";

// ─────────────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

// ── CORS ─────────────────────────────────────────────────────
app.use("*", async (c, next) => {
  const frontendUrl = c.env.FRONTEND_URL || "https://subserver-chat.pages.dev";
  return cors({
    origin: frontendUrl,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })(c, next);
});

// ── AUTH MIDDLEWARE ───────────────────────────────────────────
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, "auth_token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set("jwtPayload", payload);
    await next();
  } catch {
    return c.json({ error: "Token tidak valid atau expired" }, 401);
  }
};

const adminMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, "auth_token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload.role !== "admin") {
      return c.json({ error: "Hanya Admin yang bisa mengakses ini" }, 403);
    }
    c.set("jwtPayload", payload);
    await next();
  } catch {
    return c.json({ error: "Token tidak valid atau expired" }, 401);
  }
};

// ── PUBLIC ROUTES ─────────────────────────────────────────────
app.route("/api/auth", authRoutes);

// ── RESOLVE SUBSERVER LINK ────────────────────────────────────
app.get("/api/subserver/resolve/:link", async (c) => {
  const { drizzle } = await import("drizzle-orm/d1");
  const { subservers } = await import("./db/schema");
  const { eq } = await import("drizzle-orm");

  const link = c.req.param("link");
  const db = drizzle(c.env.DB);

  const [ss] = await db
    .select({ id: subservers.id, nama: subservers.nama, link: subservers.link, aktif: subservers.aktif, suspended: subservers.suspended })
    .from(subservers)
    .where(eq(subservers.link, link))
    .limit(1);

  if (!ss) return c.json({ error: "SubServer tidak ditemukan" }, 404);
  if (ss.suspended) return c.json({ error: "SubServer di-suspend", status: "suspended" }, 403);
  if (!ss.aktif) return c.json({ error: "SubServer tidak aktif", status: "inactive" }, 403);

  return c.json({ subserver: ss });
});

// ── PROTECTED ROUTES ──────────────────────────────────────────
app.use("/api/admin/*", adminMiddleware);
app.route("/api/admin", adminRoutes);

app.use("/api/subserver/*", authMiddleware);
app.route("/api/subserver", membershipRoutes);

app.use("/api/chat/*", authMiddleware);
app.route("/api/chat", chatRoutes);

app.use("/api/media/*", authMiddleware);
app.route("/api/media", mediaRoutes);

app.use("/api/sync/*", authMiddleware);
app.route("/api/sync", syncRoutes);

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// ── 404 ───────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Endpoint tidak ditemukan" }, 404));

// ── EXPORT ───────────────────────────────────────────────────
export default {
  fetch: app.fetch,

  // Cron Trigger — auto-delete pesan lama (jam 2 pagi)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env));
  },
};
