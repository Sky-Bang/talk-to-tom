# SubServer Chat App

PWA Native-Ready | Gen Z Aesthetic | Cloudflare Edge

## Arsitektur

- **Frontend**: React 18 + Vite + Tailwind CSS → Cloudflare Pages
- **Backend**: Hono + Drizzle ORM → Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Media**: Cloudflare R2 (Presigned URL)
- **Cache**: Cloudflare KV
- **Real-time**: Smart Polling 3 detik (tanpa Durable Objects)

## Peran User

| Peran | Kode | Akses |
|-------|------|-------|
| Admin Pusat Server | `88#` (tetap) | Dashboard kelola SubServer |
| User Utama | Manual bebas oleh Admin | Kelola anggota, chat |
| Anggota | Manual bebas oleh User Utama | Chat saja |

## Development

```bash
pnpm install
pnpm dev:frontend
pnpm dev:backend
```

## Deploy

Push ke `main` → GitHub Actions otomatis deploy ke Cloudflare.

## Catatan Penting

- Semua kode dibuat MANUAL BEBAS — tidak ada auto-generate
- Kode Admin tetap: `88#`
- Real-time via Smart Polling 3 detik (bukan WebSocket)
- Media upload langsung ke R2 via Presigned URL
