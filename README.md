# Manuscript Forge

This repository contains a Next.js (App Router) application with Tailwind, Prisma (PostgreSQL), and JWT-based auth.

## Outbox-based notifications

We use the transactional outbox pattern to deliver in-app notifications and realtime updates via Server-Sent Events (SSE).

Flow:
- Book state transitions write a row to `BookEventOutbox` within the same DB transaction.
- A background worker polls for unprocessed rows, fans out `Notification` rows to the correct recipients, publishes SSE events, and marks each outbox row processed.

Who gets notified:
- `BookSubmitted` → all Editors
- `BookMarkedReady` → all Publishers
- `BookPublished` → the Author of the book

Idempotency:
- Each outbox payload carries an `eventId`. Notifications have a unique composite `(userId, eventId)` so retries won’t duplicate rows.

## Running locally

1) Environment
- Copy `.env.example` to `.env` and ensure `DATABASE_URL` and `JWT_SECRET` are set.

2) Database
- Start Postgres: `npm run db:up`
- Apply migrations: `npm run db:migrate`
- Seed demo data: `npm run db:seed`

3) App + Worker
- Run the dev server: `npm run dev`
- In another terminal, start the outbox worker: `npm run worker`

## Realtime (SSE)
- Open a single connection to `/api/events/stream` after auth. The server authenticates the stream using the session cookie.
- Events:
  - `notification.created` (id, title, bookId, createdAt)
  - `books.statusChanged` (bookId, from, to)

The AppShell wires the bell badge and inbox to the REST APIs:
- `GET /api/notifications?unread=true&limit=20&cursor=<createdAt,id>`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/read-all`

Security & scoping:
- All notifications APIs and SSE stream use the current cookie session and are scoped to the authenticated user. APIs return JSON (401/403/409) and never redirect.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
