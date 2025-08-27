import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'

function randomEmail(prefix: string) {
  const id = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${id}@example.test`
}

let createdUserIds: string[] = []
let createdBookIds: string[] = []

// Skip helper if DATABASE_URL isn't provided
const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

maybe(!!dbUrl)('Transition endpoint → Notifications (Author submit → Editors)', () => {
  let author: { id: string; email: string }
  let editor: { id: string; email: string }
  let publisher: { id: string; email: string }

  beforeAll(async () => {
    // Create isolated users for the test
    author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'Test Author', role: 'Author' as any } })
    editor = await prisma.user.create({ data: { email: randomEmail('editor'), name: 'Test Editor', role: 'Editor' as any } })
    publisher = await prisma.user.create({ data: { email: randomEmail('publisher'), name: 'Test Publisher', role: 'Publisher' as any } })
    createdUserIds.push(author.id, editor.id, publisher.id)
  })

  afterAll(async () => {
    // Clean up created rows (delete notifications first due to FKs)
    await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
    await prisma.bookEventOutbox.deleteMany({ where: {} })
    await prisma.book.deleteMany({ where: { id: { in: createdBookIds } } })
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  })

  beforeEach(async () => {
    // Ensure a clean slate for notifications/outbox for these users
    await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
    await prisma.bookEventOutbox.deleteMany({ where: {} })
  })

  it('creates notifications for Editors and updates status to editing', async () => {
    // 1) Create a draft book for our author
    const book = await prisma.book.create({
      data: {
        title: 'Test Draft',
        content: 'Lorem ipsum',
        status: 'draft' as any,
        authorId: author.id,
      },
    })
    createdBookIds.push(book.id)

    // 2) Call the unified transition endpoint as the Author
    vi.doMock('@/lib/api-auth', async () => ({
      requireUser: async () => ({ ok: true as const, user: { id: author.id, email: author.email, name: 'Author', role: 'Author' } }),
    }))

    const body = JSON.stringify({ action: 'submit' })
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${book.id}/transition`, { method: 'POST', body }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/transition/route')
    const res = await (route as any).POST(req, { params: { id: book.id } })
    expect(res.status).toBe(200)

    // 3) Verify Editor received a notification, Author/Publisher did not
    const updated = await prisma.book.findUnique({ where: { id: book.id } })
    expect(updated?.status).toBe('editing')

    const editorNotifs = await prisma.notification.findMany({ where: { userId: editor.id, bookId: book.id, type: 'BookSubmitted' as any } })
    const authorNotifs = await prisma.notification.findMany({ where: { userId: author.id } })
    const publisherNotifs = await prisma.notification.findMany({ where: { userId: publisher.id } })

    expect(editorNotifs.length).toBeGreaterThan(0)
    const notif = editorNotifs[0]
    expect(notif.bookId).toBe(book.id)
    expect(notif.title).toContain('Submitted:')

    expect(authorNotifs.length).toBe(0)
    expect(publisherNotifs.length).toBe(0)
  })
})
