# Manuscript Forge

Manuscript Forge is a Next.js (App Router) application that demonstrates a simple publishing workflow with role-based access, real‑time updates, and an outbox-backed in‑app notifications system.

Key technologies:
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS v4 (utility-first styling)
- Prisma ORM with PostgreSQL
- JWT cookie auth (jose) + middleware for protected pages
- TanStack Query (React Query) for data fetching/cache
- Server-Sent Events (SSE) for realtime events
- Vitest for tests

## Features at a glance
- Roles: Author, Editor, Publisher, Reader
- Book state machine (draft → editing → ready → published) with a single unified transition endpoint
- RBAC + ownership checks on mutations, public reads for published content
- In-app notifications with idempotency and optional background worker
- Public landing page with featured books, author spotlight, and dynamic stats
- Dashboard panels per role with optimistic updates and live refresh
- Reviews on published books (one per Reader per book)

## Architecture
For diagrams of the data model, workflow, and notification flow, see docs/ARCHITECTURE.md.

---

## Architecture overview

### Data model (Prisma)
- User { id, email, name, role }
- Book { id, authorId, title, content, status, editorId?, publisherId?, createdAt, updatedAt }
- Review { id, bookId, readerId, rating, body, createdAt }
  - Unique constraint: (bookId, readerId)
- Notification { id, userId, type, bookId, title, body, createdAt, seenAt?, readAt?, eventId }
  - Index: (userId, readAt, createdAt), Unique: (userId, eventId)
- BookEventOutbox { id, type, payload, occurredAt, processedAt? }

### Unified book transition API
One endpoint handles all state changes:
- POST /api/books/[id]/transition
- Body: { action: 'submit' | 'ready' | 'publish' | 'changes-required' | 'not-ready' }
- Central logic in lib/bookState.ts and lib/bookTransitions.ts enforces:
  - Allowed from→to transitions per role
  - Ownership (Author-only where applicable)
  - Atomic conditional updates (updateMany WHERE id + expected status [+ authorId])
  - Outbox write with eventId idempotency key
  - Immediate Notification creation for recipients (unique on (userId,eventId))
  - SSE emits: books.statusChanged and notification.created
- Returns JSON with proper status codes (401/403/409/404).

### Notifications & realtime delivery
- Delivery modes (choose via NOTIFY_DELIVERY_MODE in .env):
  - Inline (default): notifications are created inside the transition request.
  - Worker (optional): run `npm run worker` to process BookEventOutbox asynchronously.
- SSE endpoint: GET /api/events/stream
  - Auth required; connections are registered per user and role.
  - Events sent:
    - notification.created { id, title, bookId, createdAt }
    - books.statusChanged { bookId, from, to }
- Notification APIs (all require auth, scoped to current user):
  - GET /api/notifications?unread=true&limit=20&cursor=<createdAt,id>
  - GET /api/notifications/unread-count
  - POST /api/notifications/read-all

### Public reads & reviews
- GET /api/books?status=published → public (200)
- GET /api/books/[id] → public if published; otherwise 404 (no leak)
- GET /api/books/[id]/reviews → public for published books
- POST /api/books/[id]/reviews → Reader role only, one review per book, book must be published

---

## UI overview
- Landing page (/) — public
  - Sticky header with demo login dropdown; hero; logos; features; how-it-works
  - Featured Books (from DB: latest published)
  - Author Spotlight (random author with published books)
  - Stats (live counts of published books and reviews)
- Dashboard (/dashboard) — protected by middleware
  - AppShell header with notifications bell (badge + dropdown)
  - Panels by role using React Query + optimistic updates
    - Author: manage drafts, edit/delete, submit to editing
    - Editor: review content, request changes, mark ready
    - Publisher: review content, publish or send back to editing
    - Reader: browse published books and open book detail
- Book detail (/book/[id]) — public for published
  - Content + Reviews section (list + Reader form if eligible)

Note on theme: dark-mode toggle was removed to “light-only”. Tailwind `dark:` styles remain harmless.

---

## Setup

1) Environment
- Copy example file and set secrets:

  ```bash
  cp .env.example .env
  ```

- Set a strong JWT_SECRET (e.g., `openssl rand -base64 32`).
- Ensure DATABASE_URL points at your Postgres. If you use the included docker-compose, default port is 5432; adjust your .env accordingly.
- Optional: set NOTIFY_DELIVERY_MODE=worker to use the background worker.

2) Bring everything up for development (DB + migrate + seed + dev):

- Run all:

  ```bash
  npm run dev:all
  ```

or alternatively:

- Start Postgres:
  
  ```bash
  npm run db:up
  ```
- Apply migrations and generate client:
  
  ```bash
  npm run db:migrate
  ```
- Seed demo data (users + books + sample reviews):
  
  ```bash
  npm run db:seed
  ```
- Run the app:

  ```bash
  npm run dev
  ```

3) (optional) Worker

- Optional background worker (outbox processing):
  
  ```bash
  npm run worker
  ```
---

## Demo logins
Use the Login page or the landing’s “Log in” quick menu. The backend only requires the email; the password field on the form is UI-only.
- author@example.com — Author
- editor@example.com — Editor
- publisher@example.com — Publisher
- reader@example.com — Reader

---

## Scripts
- dev: start Next.js dev server (Turbopack)
- build/start: production build & start
- lint: run ESLint
- db:up: start Postgres via docker-compose
- db:migrate: apply Prisma migrations
- db:seed: seed demo data
- dev:all: start DB, run migrations, seed, then dev
- worker: run the outbox worker loop
- test: run unit/integration tests (Vitest)
- test:worker: run optional worker test (RUN_WORKER_TESTS=1)
- postinstall: prisma generate

---

## API Summary
- Auth
  - POST /api/auth/login — sets httpOnly JWT cookie; accepts email via form or JSON; redirects to ?next or /dashboard
  - POST /api/auth/logout — clears cookie
  - GET /api/auth/me — returns current user {id,email,name,role} or 401 JSON
- Books
  - GET /api/books?status=published → public list
  - GET /api/books?status=draft|editing|ready (requires role; Authors see own; Editors=editing; Publishers=ready; Readers=published)
  - POST /api/books (Author only): create draft { title, content } (Zod-validated)
  - GET /api/books/[id] → public if published; else role-based visibility; 404 on non-published without auth
  - PUT /api/books/[id] (Author, draft only): update { title?, content? } (Zod-validated)
  - DELETE /api/books/[id] (Author, draft only)
  - POST /api/books/[id]/transition { action } — unified state changes (see above)
- Reviews
  - GET /api/books/[id]/reviews → public (published only), cursor pagination (limit, cursor)
  - POST /api/books/[id]/reviews → Reader-only, published only; one per book per user; simple rate limit (3/min/user)
- Notifications
  - GET /api/notifications?unread=true&limit=20&cursor=…
  - GET /api/notifications/unread-count
  - POST /api/notifications/read-all
- SSE
  - GET /api/events/stream (auth required)

All APIs return JSON statuses; there are no redirects under /api/*.

---

## Testing
- Run tests:

  ```bash
  npm run test
  ```

- Optional worker integration test (skipped by default):

  ```bash
  npm run test:worker
  ```

Tests include:
- Transition endpoint (happy/forbidden/conflict/ownership)
- Notifications and realtime scenarios
- Public reads for books and reviews; review POST rules
- UI regression checks for dashboard wiring and notification dropdown behavior (static source assertions)

---

## Notes & limitations
- SSE hub is in-memory (per process). For multi-process or serverless, use a shared pub/sub (e.g., Redis) and/or a queueing worker.
- “Inline” notification delivery is the default and sufficient for single-process dev. The outbox worker is optional.
- Dark mode toggle was intentionally removed; the app renders in light mode.
- Ensure your DATABASE_URL matches your running Postgres (docker-compose exposes 5432 by default). Update .env example as needed.

---

## Notifications delivery modes (detail)
- Inline (default): After a successful transition, the app writes an Outbox row and immediately delivers notifications + SSE. Simple for single process.
- Worker (optional): Set `NOTIFY_DELIVERY_MODE=worker` and run `npm run worker`. Transitions write Outbox rows; the worker processes them asynchronously (at-least-once delivery).

Outbox prevents dual-write races between DB updates and events. In production we’d publish Outbox events to SNS with SQS subscribers per channel (email, Slack, in-app). Add DLQs + idempotency (we already use `eventId`) and, for ordering, SQS FIFO with `bookId` as `MessageGroupId`.
