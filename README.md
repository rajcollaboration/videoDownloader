# Video Downloader SaaS

A production-oriented monorepo for a video downloader web application built with Next.js, FastAPI, Celery, Redis, PostgreSQL, Docker, and Nginx.

## Monorepo layout

- `frontend/` - Next.js 15 App Router frontend with TypeScript and Tailwind CSS
- `backend/` - FastAPI API, SQLAlchemy models, Celery worker, Redis-backed task queue
- `infra/nginx/` - reverse proxy configuration
- `.github/workflows/` - CI workflow

## Compliance note

This project is structured to support downloads only where legally permitted. It includes user-facing disclaimers, URL validation, rate limiting hooks, and clear separation between metadata extraction and background processing. You are responsible for enabling only compliant providers and flows for your jurisdiction and use case.

## Quick start

1. Copy `.env.example` to `.env` and fill in values.
2. Start the stack:

```bash
docker compose up --build
```

3. Ensure the stack is running (`docker compose up -d`), then open:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000/docs`
- Reverse proxy: `http://localhost`

## Frontend highlights

- Next.js App Router with TypeScript and Tailwind CSS
- SSR metadata, OpenGraph, `robots.ts`, and `sitemap.ts`
- SEO landing pages:
  - `/download-facebook-video`
  - `/download-instagram-reels`
  - `/download-youtube-video`
- Blog index and article pages with schema markup
- Light and dark theme toggle
- Hero downloader UI with skeleton states, toasts, and progress polling
- AdSense-ready placeholder components for banner, sidebar, and in-content ads

## Backend highlights

- FastAPI REST API with provider detection and URL validation
- SQLAlchemy models for resolved video requests and download jobs
- Redis-backed Celery worker for async processing
- Local storage plus S3 upload abstraction
- Basic in-memory rate limiter hook
- YouTube processing disabled by default with `ENABLE_YOUTUBE=false`

## API overview

- `POST /v1/videos/resolve`
  - Validates a public URL
  - Detects the provider
  - Fetches metadata and formats
- `POST /v1/downloads`
  - Creates an async job for a selected format
- `GET /v1/downloads/{job_id}`
  - Returns status, progress, and output path when completed
- `GET /v1/health`
  - Liveness endpoint

## Operational notes

- Large downloads and playlists are queued through Celery instead of blocking API requests.
- Cloudflare can sit in front of Nginx for caching, TLS termination, and bot protection.
- Ad placements are intentionally non-intrusive to preserve UX and search performance.
- For production, replace the demo in-memory limiter with Redis-backed throttling and add authentication for dashboard and admin routes.
- Playlist support is scaffolded with size protection. Per-video progress fan-out can be added as a follow-up by introducing a `playlist_items` table and child jobs.

## Services

- `frontend` - Next.js app
- `backend` - FastAPI API
- `worker` - Celery worker
- `redis` - cache and queue broker
- `postgres` - relational database
- `nginx` - reverse proxy

## Production (clipzyworld.online)

Deploy on a Linux VPS with Docker. DNS at BigRock must point to the server:

| Type | Host | Value |
|------|------|--------|
| A | `@` | Your server public IP |
| A | `www` | Same IP |

**On the server:**

```bash
git clone <your-repo> && cd "Video Downloader"
cp .env.production.example .env
# Edit .env — set SECRET_KEY, ADMIN_API_KEY, POSTGRES_PASSWORD, CERTBOT_EMAIL

bash scripts/deploy-production.sh init-ssl   # first time: Let's Encrypt + HTTPS
bash scripts/deploy-production.sh deploy     # later: rebuild & restart
```

Open **https://clipzyworld.online** (not port 3000). Ports **80** and **443** must be open in the firewall.

Files added for production:

- `docker-compose.prod.yml` — HTTPS nginx, no public frontend port, certbot renewal
- `infra/nginx/production.conf` — SSL reverse proxy
- `.env.production.example` — production environment template

## Environment

See `.env.example` for the required variables.

## Legal and compliance

- Show a clear disclaimer to users: download only content they own or are authorized to use.
- Keep YouTube disabled unless you have completed a legal and policy review for your use case.
- Reject private or restricted media.
- Respect platform terms, copyright law, and regional regulations before enabling providers in production.
