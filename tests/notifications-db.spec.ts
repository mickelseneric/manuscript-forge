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

// Skip helper if DATABASE_URL isn't provided
const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

maybe(!!dbUrl)('Outbox → Notifications integration', () => {
  let authorId = ''
  let editorId = ''
  let publisherId = ''

  beforeAll(async () => {
    // Create isolated users for the test
    const author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'Test Author', role: 'Author' as any } })
    const editor = await prisma.user.create({ data: { email: randomEmail('editor'), name: 'Test Editor', role: 'Editor' as any } })
    const publisher = await prisma.user.create({ data: { email: randomEmail('publisher'), name: 'Test Publisher', role: 'Publisher' as any } })
    authorId = author.id; editorId = editor.id; publisherId = publisher.id
    createdUserIds.push(authorId, editorId, publisherId)
  })

  afterAll(async () => {
    // Clean up created rows (delete notifications first due to FKs)
    await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
    await prisma.bookEventOutbox.deleteMany({ where: { id: { in: createdOutboxIds } } })
    await prisma.book.deleteMany({ where: { id: { in: createdBookIds } } })
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  })

  beforeEach(async () => {
    // Ensure a clean slate for notifications/outbox for these users
    await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
    await prisma.bookEventOutbox.deleteMany({ where: { processedAt: null } })
  })

  it('creates a notification for Editors when a draft is submitted (Author → Editor)', async () => {
    // 1) Create a draft book for our author
    const book = await prisma.book.create({
      data: {
        title: 'Test Draft',
        content: 'Lorem ipsum',
        status: 'draft' as any,
        authorId,
      },
    })
    createdBookIds.push(book.id)

    // 2) Simulate atomic transition to editing and write outbox event (as API does)
    //    We keep transition separate to focus on outbox→notification behavior
    const eventId = crypto.randomUUID()
    await prisma.$transaction(async (tx) => {
      const upd = await tx.book.updateMany({ where: { id: book.id, authorId, status: 'draft' as any }, data: { status: 'editing' as any, editorId: null, publisherId: null } })
      if (upd.count === 0) throw new Error('Transition conflict')
      const outbox = await tx.bookEventOutbox.create({
        data: {
          type: 'BookSubmitted',
          payload: { eventId, bookId: book.id, actorId: authorId, from: 'draft', to: 'editing', occurredAt: new Date().toISOString() },
          occurredAt: new Date(),
        },
      })
      createdOutboxIds.push(outbox.id)
    })

    // 3) Process outbox events (single batch)
    await processOutboxBatch(50)

    // 4) Verify Editor received a notification, Author did not
    const editorNotifs = await prisma.notification.findMany({ where: { userId: editorId } })
    const authorNotifs = await prisma.notification.findMany({ where: { userId: authorId } })
    const publisherNotifs = await prisma.notification.findMany({ where: { userId: publisherId } })

    expect(editorNotifs.length).toBeGreaterThanOrEqual(1)
    const notif = editorNotifs.find((n) => n.eventId === eventId)
    expect(notif).toBeTruthy()
    expect(notif?.type).toBe('BookSubmitted')
    expect(notif?.bookId).toBe(book.id)
    expect(notif?.title).toContain('Submitted:')

    expect(authorNotifs.length).toBe(0)
    expect(publisherNotifs.length).toBe(0)
  })
})
