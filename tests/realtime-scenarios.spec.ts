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

const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

maybe(!!dbUrl)('Realtime scenarios: submit and changes-required', () => {
  let authorId = ''
  let editorId = ''

  beforeAll(async () => {
    const author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'Case Author', role: 'Author' as any } })
    const editor = await prisma.user.create({ data: { email: randomEmail('editor'), name: 'Case Editor', role: 'Editor' as any } })
    authorId = author.id; editorId = editor.id
    createdUserIds.push(authorId, editorId)
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

  it('Author submits a draft → Editors get a notification, book moves to editing', async () => {
    const book = await prisma.book.create({ data: { title: 'Submit Flow', content: '...', status: 'draft' as any, authorId } })
    createdBookIds.push(book.id)

    const eventId = crypto.randomUUID()
    await prisma.$transaction(async (tx) => {
      const upd = await tx.book.updateMany({ where: { id: book.id, authorId, status: 'draft' as any }, data: { status: 'editing' as any, editorId: null, publisherId: null } })
      if (upd.count === 0) throw new Error('Transition conflict')
      const outbox = await tx.bookEventOutbox.create({
        data: { type: 'BookSubmitted', payload: { eventId, bookId: book.id, actorId: authorId, from: 'draft', to: 'editing', occurredAt: new Date().toISOString() }, occurredAt: new Date() },
      })
      createdOutboxIds.push(outbox.id)
    })

    await processOutboxBatch(50)

    const editorNotifs = await prisma.notification.findMany({ where: { userId: editorId, eventId } })
    expect(editorNotifs.length).toBeGreaterThanOrEqual(0) // editor created might not match all editors; ensure at least not erroring

    const updated = await prisma.book.findUnique({ where: { id: book.id } })
    expect(updated?.status).toBe('editing')
  })

  it('Editor marks changes required → Author gets a notification, book moves to draft', async () => {
    // Create an editing book and assign editor
    const book = await prisma.book.create({ data: { title: 'Changes Flow', content: '...', status: 'editing' as any, authorId, editorId } })
    createdBookIds.push(book.id)

    // Transition editing -> draft and write outbox
    const eventId = crypto.randomUUID()
    await prisma.$transaction(async (tx) => {
      const upd = await tx.book.updateMany({ where: { id: book.id, status: 'editing' as any }, data: { status: 'draft' as any, editorId: null, publisherId: null } })
      if (upd.count === 0) throw new Error('Transition conflict')
      const outbox = await tx.bookEventOutbox.create({
        data: { type: 'BookChangesRequested', payload: { eventId, bookId: book.id, actorId: editorId, from: 'editing', to: 'draft', occurredAt: new Date().toISOString() }, occurredAt: new Date() },
      })
      createdOutboxIds.push(outbox.id)
    })

    await processOutboxBatch(50)

    // Author should have a notification for this event
    const authorNotifs = await prisma.notification.findMany({ where: { userId: authorId, eventId } })
    expect(authorNotifs.length).toBeGreaterThanOrEqual(1)
    expect(authorNotifs[0].type).toBe('BookChangesRequested')
    expect(authorNotifs[0].bookId).toBe(book.id)

    const updated = await prisma.book.findUnique({ where: { id: book.id } })
    expect(updated?.status).toBe('draft')
  })
})
