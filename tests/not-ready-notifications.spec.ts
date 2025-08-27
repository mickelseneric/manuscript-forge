import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'

function randomEmail(prefix: string) {
  const id = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${id}@example.test`
}

let createdUserIds: string[] = []
let createdBookIds: string[] = []

// Skip tests if DATABASE_URL isn't configured
const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

maybe(!!dbUrl)('Transition endpoint → Notifications for not-ready (Publisher → Editors)', () => {
  let author: { id: string; email: string }
  let editor: { id: string; email: string }
  let publisher: { id: string; email: string }

  beforeAll(async () => {
    author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'NR Author', role: 'Author' as any } })
    editor = await prisma.user.create({ data: { email: randomEmail('editor'), name: 'NR Editor', role: 'Editor' as any } })
    publisher = await prisma.user.create({ data: { email: randomEmail('publisher'), name: 'NR Publisher', role: 'Publisher' as any } })
    createdUserIds.push(author.id, editor.id, publisher.id)
  })

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
    await prisma.bookEventOutbox.deleteMany({ where: {} })
    await prisma.book.deleteMany({ where: { id: { in: createdBookIds } } })
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  })

  beforeEach(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
    await prisma.bookEventOutbox.deleteMany({ where: {} })
  })

  it('creates a notification for Editors when a ready book is marked not ready', async () => {
    // Create a ready book
    const book = await prisma.book.create({ data: { title: 'NR Book', content: '...', status: 'ready' as any, authorId: author.id, editorId: editor.id, publisherId: publisher.id } })
    createdBookIds.push(book.id)

    // Call the unified transition endpoint as the Publisher
    vi.doMock('@/lib/api-auth', async () => ({
      requireUser: async () => ({ ok: true as const, user: { id: publisher.id, email: publisher.email, name: 'Publisher', role: 'Publisher' } }),
    }))

    const body = JSON.stringify({ action: 'not-ready' })
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${book.id}/transition`, { method: 'POST', body }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/transition/route')
    const res = await (route as any).POST(req, { params: { id: book.id } })
    expect(res.status).toBe(200)

    // Editors should have a notification and book status should be 'editing'
    const editorNotifs = await prisma.notification.findMany({ where: { userId: editor.id, bookId: book.id, type: 'BookNotReady' as any } })
    expect(editorNotifs.length).toBeGreaterThan(0)

    const updated = await prisma.book.findUnique({ where: { id: book.id } })
    expect(updated?.status).toBe('editing')
  })
})
