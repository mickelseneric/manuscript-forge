// This optional test verifies the outbox worker path. It is skipped by default.
// Run with: npm run test:worker (sets RUN_WORKER_TESTS=1) to execute.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '@/lib/prisma'
import { processOutboxBatch } from '@/scripts/outbox-worker'

const runWorker = process.env.RUN_WORKER_TESTS === '1'
const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

function randomEmail(prefix: string) {
  const id = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${id}@example.test`
}

maybe(!!dbUrl && runWorker)('Worker outbox processing', () => {
  let authorId = ''
  let editorId = ''
  let bookId = ''

  beforeAll(async () => {
    const author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'W Author', role: 'Author' as any } })
    const editor = await prisma.user.create({ data: { email: randomEmail('editor'), name: 'W Editor', role: 'Editor' as any } })
    authorId = author.id; editorId = editor.id
    const book = await prisma.book.create({ data: { title: 'W Book', content: '...', status: 'draft' as any, authorId } })
    bookId = book.id
  })

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: [authorId, editorId].filter(Boolean) as string[] } } })
    await prisma.bookEventOutbox.deleteMany({ where: {} })
    if (bookId) await prisma.book.deleteMany({ where: { id: bookId } })
    await prisma.user.deleteMany({ where: { id: { in: [authorId, editorId].filter(Boolean) as string[] } } })
  })

  it('processes a BookSubmitted event and creates notifications for editors', async () => {
    const eventId = crypto.randomUUID()
    await prisma.$transaction(async (tx) => {
      // Write outbox event directly (simulate producer only writing outbox)
      await tx.bookEventOutbox.create({
        data: {
          type: 'BookSubmitted',
          payload: { eventId, bookId, actorId: authorId, from: 'draft', to: 'editing', occurredAt: new Date().toISOString() },
          occurredAt: new Date(),
        },
      })
    })

    await processOutboxBatch(50)

    const editorNotifs = await prisma.notification.findMany({ where: { userId: editorId, eventId } })
    expect(editorNotifs.length).toBeGreaterThan(0)
  })
})
