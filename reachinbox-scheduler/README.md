# ReachInbox — Full-Stack Distributed Email Job Scheduler

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#testing-instructions)
[![Tests](https://img.shields.io/badge/tests-37%20passed-success)](#testing-instructions)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](https://www.typescriptlang.org/)
[![BullMQ](https://img.shields.io/badge/queue-BullMQ%20%2B%20Redis-red)](https://docs.bullmq.io/)
[![Database](https://img.shields.io/badge/database-PostgreSQL%20%2B%20Prisma-blue)](https://www.prisma.io/)
[![Search](https://img.shields.io/badge/search-Elasticsearch-yellow)](https://www.elastic.co/)

**ReachInbox Scheduler** is a high-throughput, fault-tolerant email campaign scheduling platform built for the **OUTBOX LABS Software Development Intern Assignment**. It reliably schedules batches of emails with persistent BullMQ delayed jobs, enforces atomic distributed rate-limits per sender via Redis Lua scripts, integrates real Ethereal SMTP delivery with live preview URLs, synchronizes with an Elasticsearch derived search cluster, monitors queue states via a protected Bull Board dashboard, and alerts connected Slack channels upon quota exhaustion.

---

## Table of Contents
1. [Architecture Diagram](#system-architecture)
2. [Technology Stack & Rationale](#technology-stack)
3. [Repository Structure](#repository-structure)
4. [Quickstart & Local Setup](#quickstart--local-setup)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Core Technical Implementations](#core-technical-implementations)
   - [BullMQ Delayed Queue & Redis Persistence](#1-bullmq-delayed-queue--redis-persistence)
   - [Distributed Atomic Rate Limiter (Redis Lua)](#2-distributed-atomic-rate-limiter-redis-lua)
   - [Transactional Outbox Reconciliation](#3-transactional-outbox-reconciliation)
   - [Idempotency & SMTP At-Least-Once Delivery Analysis](#4-idempotency--smtp-at-least-once-delivery-analysis)
   - [Elasticsearch Scoped Search & Recovery](#5-elasticsearch-scoped-search--recovery)
   - [Slack OAuth & Debounced Rate-Limit Notifications](#6-slack-oauth--debounced-rate-limit-notifications)
   - [Protected Bull Board Monitoring Dashboard](#7-protected-bull-board-monitoring-dashboard)
7. [API Endpoint Documentation](#api-endpoint-documentation)
8. [Database Schema Overview](#database-schema-overview)
9. [Five-Minute Technical Demo Workflow](#five-minute-technical-demo-workflow)
10. [Testing Instructions](#testing-instructions)
11. [Security Considerations](#security-considerations)
12. [Interview Guide & Engineering Trade-offs](#interview-guide--engineering-trade-offs)

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend (React + Vite + Tailwind)"]
        UI["SaaS Dashboard & Compose Modal"]
        CSV["CSV File Upload & RFC 5322 Parser"]
    end

    subgraph API_Server ["API Gateway (Express.js + TypeScript)"]
        AUTH["Auth Middleware (JWT / Secure Cookie)"]
        CTRL["Campaign & Email Controllers"]
        BULL_BOARD["Bull Board Monitor (/admin/queues)"]
        RECON["Outbox Reconciliation Service"]
    end

    subgraph Storage ["Persistent Relational Database"]
        PG[("PostgreSQL 16 (Prisma ORM)")]
    end

    subgraph Queue_Cluster ["Distributed Queue & Cache"]
        REDIS[("Redis 7 (Append-Only Persistence)")]
        LUA["Atomic Rate Limiter (Lua Script)"]
    end

    subgraph Background_Workers ["Worker Fleet (BullMQ Workers)"]
        W1["Worker Process 1"]
        W2["Worker Process N"]
    end

    subgraph External_Services ["External Services & Delivery"]
        ES[("Elasticsearch 8.17 (Derived Search)")]
        SMTP["Nodemailer + Ethereal SMTP"]
        SLACK["Slack WebClient API"]
        GOOGLE["Google OAuth 2.0"]
    end

    UI -->|1. Schedule Request + CSV| AUTH
    AUTH --> CTRL
    CTRL -->|2. Transaction: Campaign + EmailRecords| PG
    CTRL -->|3. Delayed Jobs (JobId: email-{id})| REDIS
    CTRL -->|4. Sync Document| ES
    
    W1 & W2 -->|5. Poll Delayed Jobs| REDIS
    W1 & W2 -->|6. Reserve Capacity Atomically| LUA
    LUA -->|Quota Exhausted: Defer + Trigger| SLACK
    LUA -->|Capacity Granted: Send Email| SMTP
    SMTP -->|7. Provider MessageId & Preview URL| W1
    W1 -->|8. Update Status: SENT| PG
    W1 -->|9. Update Status: SENT| ES

    RECON -.->|Periodic Audit for Missing Jobs| PG
    RECON -.->|Recover Orphaned Records| REDIS
    BULL_BOARD -->|Live Metrics| REDIS
```

---

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | **React 18 + Vite + TypeScript** | Sub-second HMR, strict type safety, responsive component architecture. |
| **Styling** | **Tailwind CSS** | Sleek modern dark mode (slate/indigo/emerald), responsive grid layouts. |
| **Client Routing** | **React Router v7** | Client-side routing, protected navigation guards, persistent sidebar state. |
| **HTTP Client** | **Axios** | Typed interceptors, automatic JWT bearer token and cookie credential injection. |
| **Backend Runtime** | **Node.js (v20+) + Express + TypeScript** | Production modularity, strict compilation, clean separation of concerns. |
| **Database & ORM** | **PostgreSQL 16 + Prisma ORM** | Relational transactions, ACID guarantees, foreign keys, cascade deletes, indexes. |
| **Job Queue** | **BullMQ 5 + Redis 7** | Persistent delayed scheduling, stable deduplicating job IDs, exponential retries. |
| **Queue Monitoring** | **Bull Board (`@bull-board/express`)** | Live administrative dashboard mounted at `/admin/queues` with auth protection. |
| **SMTP Delivery** | **Nodemailer + Ethereal Email** | Isolated test transport, auto-provisioned test mailboxes, live preview URLs. |
| **Search Engine** | **Elasticsearch 8.17** | Fast multi-match text queries on recipient/subject, user-scoped filtering, recovery scripts. |
| **Authentication** | **Google OAuth 2.0 + HTTP-Only JWT** | State CSRF validation, PostgreSQL user upsert, local dev evaluator fallback. |
| **Notifications** | **Slack Web API (`@slack/web-api`)** | Real Block Kit alerts on rate-limit exhaustion, Redis-backed hour debouncing. |
| **Input Validation** | **Zod** | Strict runtime schema parsing for all incoming JSON and multipart parameters. |
| **Infrastructure** | **Docker Compose** | Single-command containerization for PostgreSQL, Redis, and Elasticsearch. |

---

## Repository Structure

```
reachinbox-scheduler/
├── docker-compose.yml              # PostgreSQL 16, Redis 7, Elasticsearch 8.17
├── .env.example                    # Comprehensive environment variable documentation
├── .gitignore                      # Git exclusion rules
├── sample-leads.csv                # Sample leads CSV with valid/invalid/duplicate addresses
├── package.json                    # Monorepo workspaces config
├── README.md                       # Complete documentation & interview guide
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma models (User, Sender, Campaign, EmailRecord, SlackConnection)
│   │   └── seed.ts                 # Database seeder with demo accounts and sample records
│   ├── src/
│   │   ├── app.ts                  # Express application setup, security headers, Bull Board route
│   │   ├── server.ts               # HTTP API server entry point & startup reconciliation
│   │   ├── config/
│   │   │   ├── env.ts              # Zod-validated environment config
│   │   │   ├── prisma.ts           # Prisma client singleton
│   │   │   ├── redis.ts            # Redis client creation (auto in-memory mock in tests)
│   │   │   └── elasticsearch.ts    # Elasticsearch client singleton & healthcheck
│   │   ├── controllers/            # HTTP controllers (auth, sender, email, campaign, search, dashboard)
│   │   ├── middleware/             # requireAuth, errorHandler
│   │   ├── queues/                 # BullMQ emailQueue definition & stable job enqueueing
│   │   ├── workers/
│   │   │   ├── emailWorker.ts      # BullMQ worker processor with rate-limit deferral & SMTP
│   │   │   └── emailWorkerProcess.ts # Standalone worker process with graceful shutdown
│   │   ├── services/
│   │   │   ├── rateLimiter.ts      # Redis Lua script for atomic hourly rate limiting + min delay
│   │   │   ├── smtpService.ts      # Nodemailer Ethereal transport & error classification
│   │   │   ├── slackService.ts     # Slack WebClient & Redis hour-window debounced alerts
│   │   │   ├── elasticsearchService.ts # Indexing, scoped search & PostgreSQL fallback
│   │   │   └── reconciliationService.ts # Transactional outbox recovery for orphan records
│   │   ├── utils/                  # crypto (AES-256), csvParser (RFC 5322), logger
│   │   ├── types/                  # Typed interfaces across services
│   │   └── scripts/                # CLI reindex and reconciliation scripts
│   └── tests/                      # 8 Test suites (37 passing automated tests)
│
└── frontend/
    ├── src/
    │   ├── api/client.ts           # Typed Axios client methods
    │   ├── components/             # Sidebar, Header, StatsCard, StatusBadge, CsvDropzone, ComposeModal
    │   ├── context/AuthContext.tsx # User session provider & dev login handler
    │   ├── pages/                  # Dashboard, Scheduled, Sent, Failed, Senders, Settings, Login
    │   ├── types/index.ts          # Frontend data interfaces
    │   ├── App.tsx                 # Protected routing & layout
    │   └── main.tsx                # React DOM root
    ├── vite.config.ts              # Vite proxy configuration for /api and /admin
    └── tailwind.config.js          # ReachInbox dark theme palette
```

---

## Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Docker Desktop**: For running PostgreSQL, Redis, and Elasticsearch

### 2. Clone and Configure Environment
```bash
git clone <repository_url>
cd reachinbox-scheduler

# Copy environment template
cp backend/.env.example backend/.env
```

### 3. Start Infrastructure via Docker Compose
```bash
docker compose up -d
```
*Containers started:*
- PostgreSQL on `localhost:5432` (`user: postgres`, `password: postgres`, `db: reachinbox`)
- Redis on `localhost:6379` (Append-Only persistence enabled)
- Elasticsearch on `localhost:9200` (`discovery.type=single-node`, heap limit 512MB)

### 4. Initialize Database
```bash
cd backend
npx prisma db push
npm run db:seed
```

### 5. Start the Services
Open two terminal windows:

**Terminal 1 — API Server & Background Worker:**
```bash
# In backend/
npm run dev:server
# In another terminal (or background process):
npm run dev:worker
```

**Terminal 2 — Frontend Application:**
```bash
# In frontend/
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for the Express HTTP server |
| `NODE_ENV` | `development` | Runtime environment (`development`, `test`, `production`) |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin and OAuth redirect target |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public` | Prisma PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `WORKER_CONCURRENCY` | `5` | BullMQ worker concurrent job processors |
| `MIN_DELAY_MS` | `2000` | Default minimum millisecond delay between sends per sender |
| `MAX_EMAILS_PER_HOUR_PER_SENDER`| `200` | Default hourly quota per sender identity |
| `ETHEREAL_USER` | *(empty)* | Optional. If empty, automatically provisions an Ethereal account |
| `ETHEREAL_PASS` | *(empty)* | Optional. Ethereal account password |
| `ELASTICSEARCH_NODE` | `http://localhost:9200` | Elasticsearch cluster endpoint |
| `ELASTICSEARCH_INDEX` | `reachinbox_emails` | Target index for email documents |
| `JWT_SECRET` | `reachinbox_jwt_secret_dev` | Secret key for signing session tokens |
| `ENCRYPTION_KEY` | `0123456789abcdef...` | 32-byte hex key for AES-256 Slack token encryption |
| `GOOGLE_CLIENT_ID` | *(optional)* | Google Cloud OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | *(optional)* | Google Cloud OAuth Client Secret |
| `SLACK_CLIENT_ID` | *(optional)* | Slack App OAuth Client ID |
| `SLACK_CLIENT_SECRET` | *(optional)* | Slack App OAuth Client Secret |

---

## Core Technical Implementations

### 1. BullMQ Delayed Queue & Redis Persistence
The platform strictly avoids `cron`, `node-cron`, or OS cron. BullMQ delayed jobs are used:
- Each email record receives a stable job identifier: `jobId: email-${emailRecordId}`.
- Delay is calculated at creation: `delay = Math.max(0, scheduledTime.getTime() - Date.now())`.
- Redis stores delayed jobs in a sorted set ordered by execution timestamp.
- **Restart Persistence:** Because Redis is run with `appendonly yes`, shutting down the API server or worker process preserves all delayed jobs in Redis. When workers restart, BullMQ automatically resumes pending timers without job duplication.

### 2. Distributed Atomic Rate Limiter (Redis Lua)
To enforce rate limits across multiple concurrent worker processes without race conditions, capacity reservation is executed via an atomic Redis Lua script:
```lua
local senderId = KEYS[1]
local currentMs = tonumber(ARGV[1])
local hourlyLimit = tonumber(ARGV[2])
local minDelayMs = tonumber(ARGV[3])
local windowIndex = math.floor(currentMs / 3600000)

local hourKey = "rate_limit:" .. senderId .. ":hour:" .. windowIndex
local lastSendKey = "rate_limit:" .. senderId .. ":last_send"

-- 1. Check minimum interval between sends
local lastSendStr = redis.call("GET", lastSendKey)
if lastSendStr then
  local diff = currentMs - tonumber(lastSendStr)
  if diff < minDelayMs then
    return {0, "min_delay", tostring(minDelayMs - diff)}
  end
end

-- 2. Check hourly limit
local currentCount = tonumber(redis.call("GET", hourKey) or "0")
if currentCount >= hourlyLimit then
  local nextWindowMs = (windowIndex + 1) * 3600000
  return {0, "hourly_limit", tostring(nextWindowMs - currentMs + 500), tostring(currentCount)}
end

-- 3. Atomically increment quota & update last send
redis.call("INCR", hourKey)
redis.call("SET", lastSendKey, tostring(currentMs), "EX", 3600)
return {1, "ok"}
```
- **Deferral without Drops:** If `allowed == 0` due to `hourly_limit`, the worker calculates the start of the next hourly window and calls `job.moveToDelayed(nextWindowMs)`. The database record is marked `status = 'deferred'`, and the job will execute at the next window.

### 3. Transactional Outbox Reconciliation
When scheduling a campaign:
1. PostgreSQL creates the `Campaign` and all associated `EmailRecord`s inside an atomic `prisma.$transaction`.
2. Each email is enqueued to BullMQ.
3. If Redis or the network drops during enqueueing, database records remain in `status = 'scheduled'`.
4. `ReconciliationService` scans PostgreSQL for pending records missing from BullMQ and re-enqueues them with correct delays.

### 4. Idempotency & SMTP At-Least-Once Delivery Analysis
- **Distributed Two-Phase Commit Problem:** Perfect exactly-once delivery across an asynchronous queue and an external SMTP server is theoretically impossible in distributed systems without two-phase commit support from SMTP. If a worker accepts a message, SMTP transmits it, and the worker host crashes before updating PostgreSQL, the job may retry.
- **ReachInbox Safeguards:**
  1. **Stable Job Identifiers:** BullMQ deduplicates duplicate additions by `jobId: email-${emailRecord.id}`.
  2. **Database-Backed Pre-Flight Check:** The worker immediately inspects `emailRecord.status`. If already `sent`, the job terminates immediately without sending.
  3. **Atomic Rate Limit Rollback:** If an email fails permanently or transiently before network transmission, the reserved quota count is rolled back.

### 5. Elasticsearch Scoped Search & Recovery
- All created and updated email records are mirrored into Elasticsearch index `reachinbox_emails`.
- Multi-match queries search `recipientEmail` and `subject` with fuzzy matching.
- Every search query includes `{ term: { userId: currentUserId } }` to ensure complete tenant data isolation.
- **Fail-Safe Fallback:** If the Elasticsearch cluster becomes unavailable, search requests transparently fall back to PostgreSQL `ILIKE` queries, ensuring zero user-facing downtime.

### 6. Slack OAuth & Debounced Rate-Limit Notifications
- Real Slack OAuth flow connects user workspaces.
- Tokens are encrypted at rest using AES-256-GCM.
- When an hourly rate limit is exceeded, `@slack/web-api` posts a formatted Block Kit alert.
- **Debounce:** A Redis key `slack_alert:{senderId}:hour:{windowIndex}` prevents spamming Slack with more than one alert per hour window per sender.

### 7. Protected Bull Board Monitoring Dashboard
- `@bull-board/express` is mounted at `/admin/queues`.
- The route is protected by `requireAuth` middleware to ensure only authenticated operators can view queue telemetry.

---

## API Endpoint Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `POST` | `/api/auth/dev-login` | Development evaluator sign-in (for local review) |
| `GET` | `/api/auth/google` | Initiate Google OAuth 2.0 flow |
| `GET` | `/api/auth/google/callback` | Google OAuth redirect callback |
| `GET` | `/api/auth/slack` | Initiate Slack OAuth flow |
| `GET` | `/api/auth/slack/callback` | Slack OAuth redirect callback |
| `GET` | `/api/auth/slack/status` | Get Slack integration status |
| `DELETE` | `/api/auth/slack/disconnect` | Disconnect connected Slack workspace |

### Email Scheduling (`/api/emails`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/emails/schedule` | Schedule batch emails with future start, delay, and hourly limit |
| `POST` | `/api/emails/upload-csv` | Validate CSV file and preview recipient count & duplicates |
| `GET` | `/api/emails/scheduled` | List scheduled/deferred email queue |
| `GET` | `/api/emails/sent` | List delivered emails with Ethereal preview links |
| `GET` | `/api/emails/failed` | List failed emails with error diagnostics |
| `GET` | `/api/emails/:id` | Fetch single email record with ownership check |
| `POST` | `/api/emails/reconcile` | Trigger transactional outbox reconciliation |

### Senders & Campaigns (`/api/senders`, `/api/campaigns`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/senders` | List senders with live hourly quota usage metrics |
| `POST` | `/api/senders` | Create new sender identity |
| `PATCH` | `/api/senders/:id` | Update sender limits, delay, or active toggle |
| `GET` | `/api/campaigns` | List campaigns with progress counts |
| `GET` | `/api/campaigns/:id` | Get campaign details and recipient breakdown |

### Search & Dashboard (`/api/search`, `/api/dashboard`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/search/emails?q=...` | Elasticsearch search scoped to authenticated user |
| `POST` | `/api/search/reindex` | Full reindex from PostgreSQL to Elasticsearch |
| `GET` | `/api/dashboard/stats` | Dashboard KPIs, queue metrics, and system health |

---

## Database Schema Overview

```prisma
model User {
  id        String   @id @default(uuid())
  googleId  String?  @unique
  name      String
  email     String   @unique
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  senders   Sender[]
  campaigns Campaign[]
}

model Sender {
  id                String   @id @default(uuid())
  userId            String
  email             String
  name              String
  hourlyLimit       Int      @default(200)
  minSendIntervalMs Int      @default(2000)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(fields: [userId], references: [id])
}

model Campaign {
  id                  String   @id @default(uuid())
  userId              String
  subject             String
  body                String
  startTime           DateTime
  delayBetweenSendsMs Int      @default(2000)
  hourlyLimit         Int      @default(200)
  status              String   @default("SCHEDULED")
  emailRecords        EmailRecord[]
}

model EmailRecord {
  id                String    @id @default(uuid())
  campaignId        String
  senderId          String
  recipientEmail    String
  subjectSnapshot   String
  bodySnapshot      String
  status            String    @default("scheduled") // scheduled, processing, sent, failed, deferred
  scheduledTime     DateTime
  sentTime          DateTime?
  attemptCount      Int       @default(0)
  lastError         String?
  providerMessageId String?
  previewUrl        String?
  idempotencyKey    String    @unique
}

model SlackConnection {
  id                   String   @id @default(uuid())
  userId               String   @unique
  teamId               String
  teamName             String
  encryptedAccessToken String
  status               String   @default("ACTIVE")
}
```

---

## Five-Minute Technical Demo Workflow

Follow these steps to demonstrate all critical requirements:

1. **Sign In**: Navigate to `http://localhost:5173`. Click **"Launch Dashboard as Evaluator"** (or use Google Sign-In if configured).
2. **Upload CSV**: Click **"Compose Email"** in the top right. Drag and drop `sample-leads.csv`. Observe:
   - Live recipient detection: 7 total rows detected.
   - Duplicate address (`sarah.connor@cyberdyne.io`) automatically deduplicated.
   - Invalid email (`invalid-email-address-test`) safely filtered with validation feedback.
3. **Schedule Emails**: Set start time to 1 minute in the future. Set delay to `2000ms`. Click **"Schedule Campaign"**.
4. **Inspect Scheduled Tab**: Switch to **"Scheduled Emails"**. See records marked `SCHEDULED`.
5. **Inspect Bull Board**: Open `http://localhost:5000/admin/queues` in a new tab. Observe the delayed jobs sitting in Redis.
6. **Simulate Worker Restart**: Stop the worker terminal and restart it (`npm run dev:worker`). Refresh Bull Board to prove delayed jobs remain safely persistent in Redis.
7. **Observe Delivery**: Once the scheduled time arrives, the worker processes each job spaced by `2000ms`. Status transitions to `SENT`.
8. **View Ethereal Preview**: Go to the **"Sent History"** tab on the frontend. Click **"View Email"** on any record to open the real rendered HTML test message directly in Ethereal webmail.
9. **Verify Rate Limiting & Slack**: In **Sender Accounts**, create a sender with `Hourly Limit = 1`. Schedule 3 emails. The 1st email sends immediately; emails 2 and 3 transition to `DEFERRED` and are rescheduled to the next hour window. If Slack is connected, a real Slack alert is delivered.
10. **Elasticsearch Search**: Type a recipient name into the search bar in the top navigation header. Notice real-time scoped hits returned from the Elasticsearch index.

---

## Testing Instructions

The repository includes a comprehensive automated test suite with **37 passing unit and integration tests** covering:
- RFC 5322 CSV recipient parsing and duplicate filtering
- AES-256 cryptographic token security
- SMTP transient vs permanent error classification
- Distributed atomic rate limiting and Redis Lua script logic
- BullMQ delayed job creation and stable job IDs
- Slack connection, token encryption, and hourly debounce
- Elasticsearch search and PostgreSQL fail-safe fallback
- API validation, ownership checks, and authentication middleware

### Run Test Suite:
```bash
cd backend
npm test
```

### Run TypeScript Verification:
```bash
# Backend TypeScript check
npm --prefix backend run build

# Frontend TypeScript check
npm --prefix frontend run build
```

---

## Security Considerations
1. **OAuth State Verification:** Google and Slack OAuth handshakes generate cryptographically secure random `state` parameters stored with 10-minute expirations to prevent CSRF.
2. **Token Encryption:** Slack OAuth access tokens are encrypted using AES-256-GCM before storage in PostgreSQL. Secrets are never returned to the frontend.
3. **Session Cookies:** Signed HTTP-only, SameSite cookies protect against XSS token harvesting.
4. **Log Sanitization:** A custom logger automatically scrubs passwords, bearer tokens, and secrets from application logs.
5. **Tenant Isolation:** All search, scheduling, and sender endpoints enforce strict PostgreSQL `userId` ownership checks.

---

## Interview Guide & Engineering Trade-offs

### Why Redis + BullMQ instead of OS Cron or node-cron?
`node-cron` runs in-memory on a single Node process. If the server restarts or crashes, all scheduled state is lost. If multiple server instances run, cron triggers duplicate executions. **BullMQ + Redis** stores delayed timers in a shared, persistent Redis sorted set. This enables high concurrency across multiple worker hosts, automatic recovery after process restarts, and reliable retry backoffs.

### Why Redis Lua for Rate Limiting?
In a multi-worker cluster, inspecting a rate limit counter with a standard `GET` and then updating with `SET` suffers from a classic Time-of-Check to Time-of-Use (TOCTOU) race condition. Multiple workers can read counter `199` simultaneously and exceed a 200/hr limit. Redis executes Lua scripts **atomically in a single thread**, ensuring zero race conditions.

### What is the Trade-off between PostgreSQL and Elasticsearch?
PostgreSQL provides ACID transactions and acts as the source of truth for email delivery state. Elasticsearch is optimized for inverted-index fuzzy search across millions of email bodies and recipients. Because Elasticsearch is derived, any indexing failure is caught gracefully without failing the database transaction, and a reindex command can restore the search index at any time.

---

**Outbox Labs Software Development Intern Assignment — Technical Implementation Completed.**
