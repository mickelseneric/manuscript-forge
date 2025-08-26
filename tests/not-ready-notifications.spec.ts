import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { processOutboxBatch } from '@/scripts/outbox-worker'

function randomEmail(prefix: string) {
  const id = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${id}@example.test`
}

let createdUserIds: string[] = []
let createdBookIds: string[] = []
let createdOutboxIds: string[] = []

// Skip tests if DATABASE_URL isn't configured
const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

maybe(!!dbUrl)('Outbox → Notifications for BookNotReady (Publisher → Editors)', () => {
  let authorId = ''
  let editorId = ''
  let publisherId = ''

  beforeAll(async () => {
    const author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'NR Author', role: 'Author' as any } })
    const editor = await prisma.user.create({ data: { email: randomEmail('editor'), name: 'NR Editor', role: 'Editor' as any } })
    const publisher = await prisma.user.create({ data: { email: randomEmail('publisher'), name: 'NR Publisher', role: 'Publisher' as any } })
    authorId = author.id; editorId = editor.id; publisherId = publisher.id
    createdUserIds.push(authorId, editorId, publisherId)
  })

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
    await prisma.bookEventOutbox.deleteMany({ where: { id: { in: createdOutboxIds } } })
    await prisma.book.deleteMany({ where: { id: { in: createdBookIds } } })
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  })

  beforeEach(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
    await prisma.bookEventOutbox.deleteMany({ where: { processedAt: null } })
  })

  it('creates a notification for Editors when a ready book is marked not ready', async () => {
    // Create a ready book
    const book = await prisma.book.create({ data: { title: 'NR Book', content: '...', status: 'ready' as any, authorId, editorId, publisherId } })
    createdBookIds.push(book.id)

    // Simulate transition: ready -> editing by Publisher; write outbox
    const eventId = crypto.randomUUID()
    await prisma.$transaction(async (tx) => {
      const upd = await tx.book.updateMany({ where: { id: book.id, status: 'ready' as any }, data: { status: 'editing' as any, publisherId: null } })
      if (upd.count === 0) throw new Error('Transition conflict')
      const outbox = await tx.bookEventOutbox.create({
        data: {
          type: 'BookNotReady',
          payload: { eventId, bookId: book.id, actorId: publisherId, from: 'ready', to: 'editing', occurredAt: new Date().toISOString() },
          occurredAt: new Date(),
        },
      })
      createdOutboxIds.push(outbox.id)
    })

    // Process outbox events
    await processOutboxBatch(50)

    // Editors should have a notification for this event
    const editorNotifs = await prisma.notification.findMany({ where: { userId: editorId, eventId } })
    expect(editorNotifs.length).toBeGreaterThanOrEqual(1)
    expect(editorNotifs[0].type).toBe('BookNotReady')
    expect(editorNotifs[0].bookId).toBe(book.id)
  })
})
