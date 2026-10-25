# ReachInbox Email Job Scheduler

A full-stack, production-ready **email campaign scheduling platform** built with React + Vite (frontend) and Node.js + Express + Prisma + BullMQ (backend). Schedule mass outreach campaigns with atomic rate limiting, automatic retry, Ethereal email previews, and a beautiful SaaS-grade UI.

---

## ✨ Features

- **Campaign Scheduling** – Schedule email campaigns with staggered delivery, per-sender hourly limits, and configurable minimum delay intervals
- **Persistent Queue** – SQLite-backed outbox pattern with automatic dispatcher loop; emails are delivered even without Redis
- **BullMQ Integration** – Delayed job queue with Redis when available; graceful fallback to database polling when Redis is offline
- **Atomic Rate Limiting** – Redis Lua scripts enforce per-sender hourly caps and minimum send intervals without races
- **Ethereal Email Previews** – Real SMTP delivery via auto-provisioned Ethereal test accounts with clickable preview URLs
- **Elasticsearch Search** – Full-text search across recipients and subjects with graceful SQLite fallback
- **Slack Notifications** – Rate-limit alerts sent to connected Slack workspaces via Block Kit
- **Google OAuth 2.0** – Production authentication flow (plus a 1-click dev login for evaluation)
- **Bull Board Dashboard** – Live BullMQ queue monitoring at `/admin/queues`
- **10-Page SaaS UI** – Dashboard, Compose, Scheduled, Sent, Failed, Campaigns, Search, Sender Settings, Slack Integration, Queue Monitoring

---

## 🗂️ Project Structure

```
outbox/
└── reachinbox-scheduler/
    ├── backend/          # Express + Prisma + BullMQ API
    │   ├── prisma/       # Schema, migrations, seed
    │   ├── src/
    │   │   ├── config/   # env, redis, prisma, elasticsearch
    │   │   ├── controllers/
    │   │   ├── middleware/
    │   │   ├── queues/   # emailQueue.ts (BullMQ)
    │   │   ├── routes/
    │   │   ├── services/ # emailDispatcher, rateLimiter, smtpService, slackService, elasticsearchService
    │   │   ├── workers/  # emailWorker.ts
    │   │   └── server.ts
    │   └── tests/
    └── frontend/         # React + Vite + TypeScript + Tailwind
        └── src/
            ├── components/
            ├── contexts/
            ├── features/
            │   ├── auth/         # LoginPage
            │   ├── campaigns/    # ComposeCampaignPage, CampaignsPage
            │   ├── dashboard/    # DashboardPage
            │   ├── emails/       # ScheduledEmailsPage, SentEmailsPage, FailedEmailsPage
            │   ├── queues/       # QueueMonitoringPage
            │   ├── search/       # SearchPage
            │   ├── senders/      # SenderSettingsPage
            │   └── slack/        # SlackIntegrationPage
            ├── routes/
            └── services/         # apiClient, authService, emailService, campaignService, etc.
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | >= 18 | |
| npm | >= 9 | |
| Redis | Optional | Backend works without it via SQLite dispatcher |
| Elasticsearch | Optional | Falls back to SQLite search |

> **No Docker required.** The database is a self-contained local SQLite file (`backend/prisma/dev.db`).

---

### 1. Clone & Install

```bash
git clone https://github.com/Kunal455/outbox.git
cd outbox/reachinbox-scheduler

# Install backend dependencies
npm --prefix backend install

# Install frontend dependencies
npm --prefix frontend install
```

---

### 2. Configure Environment

Copy and edit the backend environment file:

```bash
cp backend/.env.example backend/.env
```

The only **required** variable is already set for SQLite:

```env
DATABASE_URL="file:./dev.db"
```

All other variables have safe defaults for local development (Redis, Elasticsearch, SMTP are all optional and fail gracefully).

#### Full `.env` Reference

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database (SQLite - zero setup)
DATABASE_URL="file:./dev.db"

# Redis & BullMQ (optional - backend works without Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting
MIN_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200
WORKER_CONCURRENCY=5

# SMTP via Ethereal (auto-provisioned if left empty)
ETHEREAL_USER=
ETHEREAL_PASS=

# Elasticsearch (optional - falls back to SQLite)
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=reachinbox_emails

# JWT & Cookies
JWT_SECRET=reachinbox_super_secret_jwt_key_2026_dev_secure
COOKIE_SECRET=reachinbox_super_secret_cookie_key_2026_dev
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Slack (optional)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5000/api/auth/slack/callback
SLACK_SIGNING_SECRET=
```

---

### 3. Initialize the Database

```bash
# Push Prisma schema to SQLite
npm --prefix backend run db:push

# Seed demo data (Alex Morgan, senders, sample campaigns)
npm --prefix backend run db:seed
```

---

### 4. Run the App

Open **two terminals**:

**Terminal 1 - Backend** (port 5000):
```bash
cd outbox/reachinbox-scheduler/backend
npm run dev:server
```

**Terminal 2 - Frontend** (port 5173):
```bash
cd outbox/reachinbox-scheduler/frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

### 5. Login

Click **"Sign in as Alex Morgan"** on the login page - no password needed. This uses the built-in dev login endpoint that creates/upserts the evaluator account.

> For Google OAuth, provide `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from [Google Cloud Console](https://console.cloud.google.com).

---

## 🧪 Tests

```bash
# Backend (37 tests)
npm --prefix reachinbox-scheduler/backend test

# Frontend (19 tests)
npm --prefix reachinbox-scheduler/frontend test
```

All 56 tests pass.

---

## 📡 API Reference

All routes are prefixed with `/api`. Protected routes require a `Bearer` token in the `Authorization` header.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/dev-login` | No | 1-click dev login (returns JWT) |
| `GET` | `/api/auth/me` | Yes | Get current user |
| `POST` | `/api/auth/logout` | Yes | Clear session |
| `GET` | `/api/auth/google` | No | Start Google OAuth flow |

### Emails

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/emails/schedule` | Yes | Schedule a campaign |
| `GET` | `/api/emails/scheduled` | Yes | List scheduled emails |
| `GET` | `/api/emails/sent` | Yes | List sent emails |
| `GET` | `/api/emails/failed` | Yes | List failed emails |
| `POST` | `/api/emails/retry-failed` | Yes | Re-queue all failed emails |
| `POST` | `/api/emails/upload-csv` | Yes | Validate & preview CSV |
| `POST` | `/api/emails/reconcile` | Yes | Reconcile outbox with BullMQ |
| `GET` | `/api/emails/:id` | Yes | Get single email record |

### Campaigns

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/campaigns` | Yes | List all campaigns |
| `POST` | `/api/campaigns` | Yes | Create campaign |
| `GET` | `/api/campaigns/:id` | Yes | Get campaign details |

### Senders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/senders` | Yes | List senders with live rate limit metrics |
| `POST` | `/api/senders` | Yes | Create sender identity |
| `PATCH` | `/api/senders/:id` | Yes | Update sender |

### Other

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/dashboard/stats` | Yes | Dashboard metrics |
| `GET` | `/api/search?q=...` | Yes | Search emails |
| `GET` | `/health` | No | Server health check |
| `GET` | `/admin/queues` | Yes | Bull Board queue dashboard |

---

## 🏗️ Architecture

```
+-----------------------------------------------------+
|            React + Vite Frontend                    |
|     Tailwind CSS   TypeScript   Axios               |
|            http://localhost:5173                    |
+---------------------+-------------------------------+
                      | Proxied /api -> :5000
+---------------------v-------------------------------+
|              Express API Server                     |
|     Helmet   CORS   JWT Auth   Zod Validation       |
|            http://localhost:5000                    |
+------+-------------+-------------+-----------------+
       |             |             |
  +----v----+  +-----v-----+  +---v---------------+
  | SQLite  |  |  BullMQ   |  |  Ethereal SMTP   |
  |(Prisma) |  |  + Redis  |  |  (auto test acct)|
  +---------+  +-----+-----+  +------------------+
                     |
              +------v------+
              |Email Worker |
              |(processDue) |
              +-------------+
```

### Key Design Decisions

- **Outbox Pattern** - Emails are persisted to SQLite *before* enqueueing to BullMQ. A 3-second polling dispatcher loop delivers emails even when Redis is offline.
- **Resilient Redis** - All Redis operations have fast-path status checks (`redisClient.status !== 'ready'`) and 1.5s timeouts, preventing hangs.
- **Sender Auto-Provisioning** - If no `senderId` is provided, the controller auto-falls-back to the user's first active sender (or creates one).
- **Elasticsearch -> SQLite Fallback** - All search operations degrade gracefully to Prisma SQLite queries.

---

## 🎨 UI Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Dev login or Google OAuth |
| `/dashboard` | Dashboard | 4 KPI cards, recent campaigns, queue summary |
| `/compose` | Compose Campaign | Rich email editor, CSV upload, scheduling |
| `/scheduled` | Scheduled Emails | Filter, paginate, live status |
| `/sent` | Sent Emails | Ethereal preview URLs |
| `/failed` | Failed Emails | Retry all button |
| `/campaigns` | Campaigns | Create, filter by status |
| `/search` | Search | Full-text with keyboard shortcut |
| `/settings/senders` | Sender Settings | Verified badge, hourly limit |
| `/settings/slack` | Slack Integration | Connect workspace, notifications |
| `/settings/queues` | Queue Monitoring | BullMQ stats, Bull Board link |

---

## 🛠️ Available Scripts

### Backend

```bash
npm run dev:server       # Start API server with hot reload
npm run dev:worker       # Start BullMQ worker process
npm run build            # Compile TypeScript
npm run test             # Run all backend tests (vitest)
npm run db:push          # Sync Prisma schema to SQLite
npm run db:seed          # Seed demo data
npm run db:generate      # Regenerate Prisma client
```

### Frontend

```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Build production bundle
npm run test             # Run frontend tests (vitest)
```

---

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express 4
- **ORM**: Prisma 5 (SQLite in dev, PostgreSQL in production)
- **Queue**: BullMQ 5 + ioredis
- **SMTP**: Nodemailer + Ethereal Email
- **Search**: Elasticsearch 8 (optional)
- **Auth**: JWT + Google OAuth 2.0
- **Testing**: Vitest

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Testing**: Vitest + Testing Library

---

## 🌐 Deployment Notes

1. Set `NODE_ENV=production` and switch `schema.prisma` to `provider = "postgresql"` with a real `DATABASE_URL`.
2. Provision a Redis instance (Upstash, Redis Cloud, etc.) and set `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`.
3. Set secure `JWT_SECRET`, `ENCRYPTION_KEY`, and `COOKIE_SECRET` values (use `openssl rand -hex 32`).
4. Configure Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com).
5. Run `npm run build` for the frontend and serve `dist/` via Vercel, Netlify, or a CDN.

---

## 📄 License

MIT
