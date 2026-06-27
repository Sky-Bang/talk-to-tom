# SubServer Chat — Setup Guide

## 1. Buat Resource Cloudflare

### D1 Database
```bash
wrangler d1 create subserver-db
# Copy database_id ke backend/wrangler.toml
```

### KV Namespace
```bash
wrangler kv:namespace create RATE_LIMIT_KV
# Copy id ke backend/wrangler.toml
```

### R2 Bucket
```bash
wrangler r2 bucket create subserver-media
# Aktifkan public access di Cloudflare Dashboard
# Copy public URL ke wrangler.toml
```

### Cloudflare Pages
```bash
wrangler pages project create subserver-chat
```

## 2. Update wrangler.toml

Edit `backend/wrangler.toml` dan ganti:
- `REPLACE_WITH_YOUR_D1_ID` → database_id dari D1
- `REPLACE_WITH_YOUR_KV_ID` → id dari KV

## 3. Set Secrets (via Wrangler CLI)

```bash
cd backend

# Wajib
wrangler secret put JWT_SECRET          # Random string panjang
wrangler secret put ADMIN_CODE          # Isi dengan: 88#

# Untuk R2 Presigned URL
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_BUCKET_NAME
wrangler secret put R2_PUBLIC_URL       # URL public R2 bucket
```

## 4. Set GitHub Repository Secrets

Di GitHub repo Settings → Secrets and Variables → Actions:

| Secret | Nilai |
|--------|-------|
| `CF_API_TOKEN` | API Token Cloudflare (permissions: D1, Workers, Pages, KV, R2) |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID Cloudflare kamu |
| `VITE_API_URL` | URL Worker kamu (cth: https://subserver-chat-api.your-subdomain.workers.dev) |

## 5. Deploy Manual Pertama Kali

```bash
cd backend

# Jalankan migrasi DB
pnpm wrangler d1 migrations apply subserver-db --remote

# Deploy Worker
pnpm wrangler deploy src/index.ts
```

```bash
cd frontend

# Build & deploy ke Pages
VITE_API_URL=https://your-worker-url.workers.dev pnpm build
pnpm wrangler pages deploy dist --project-name=subserver-chat
```

## 6. Setup selesai!

Setelah itu, setiap push ke `main` akan auto-deploy via GitHub Actions.

### URL yang Dihasilkan
- **Frontend**: `https://subserver-chat.pages.dev`
- **Backend (API)**: `https://subserver-chat-api.your-subdomain.workers.dev`

### Login pertama
1. Buka `https://subserver-chat.pages.dev`
2. Masukkan kode: `88#`
3. Kamu masuk sebagai Admin Pusat
4. Buat SubServer pertama via Dashboard

---

## Struktur Kode

```
├── backend/          # Cloudflare Workers (Hono + Drizzle)
│   ├── src/
│   │   ├── db/       # Schema D1 + Migrations SQL
│   │   ├── routes/   # auth, admin, membership, chat, media, sync
│   │   ├── utils/    # JWT, rateLimit, cronCleanup
│   │   └── index.ts  # Entry point
│   └── wrangler.toml
│
├── frontend/         # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── api/      # Client API (fetch wrapper)
│   │   ├── components/ # UI, chat, layout
│   │   ├── hooks/    # usePolling, useChat, useMediaUpload
│   │   ├── pages/    # Login, Admin, GroupChat, DM, Kontak, Profil
│   │   └── stores/   # Zustand (authStore)
│   └── public/       # PWA assets, _headers, _redirects
│
└── .github/
    └── workflows/
        ├── deploy.yml    # Auto-deploy ke Cloudflare
        └── typecheck.yml # TypeScript check
```

## Catatan Penting

- **Semua kode dibuat MANUAL** — tidak ada auto-generate
- **Kode Admin tetap**: `88#`
- **Real-time via Smart Polling** 3 detik (bukan WebSocket)
- **Media upload langsung ke R2** via Presigned URL (bypass Worker)
- **Auto-delete**: teks 48jam, media 24jam (via Cron trigger jam 2 pagi)
