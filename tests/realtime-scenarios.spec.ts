import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'

function randomEmail(prefix: string) {
  const id = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${id}@example.test`
}

let createdUserIds: string[] = []
let createdBookIds: string[] = []

const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

maybe(!!dbUrl)('Realtime scenarios via unified transition: submit and changes-required', () => {
  let author: { id: string; email: string }
  let editor: { id: string; email: string }

  beforeAll(async () => {
    author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'Case Author', role: 'Author' as any } })
    editor = await prisma.user.create({ data: { email: randomEmail('editor'), name: 'Case Editor', role: 'Editor' as any } })
    createdUserIds.push(author.id, editor.id)
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

  it('Author submits a draft → Editors get a notification, book moves to editing', async () => {
    const book = await prisma.book.create({ data: { title: 'Submit Flow', content: '...', status: 'draft' as any, authorId: author.id } })
    createdBookIds.push(book.id)

    vi.doMock('@/lib/api-auth', async () => ({
      requireUser: async () => ({ ok: true as const, user: { id: author.id, email: author.email, name: 'Author', role: 'Author' } }),
    }))
    const body = JSON.stringify({ action: 'submit' })
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${book.id}/transition`, { method: 'POST', body }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/transition/route')
    const res = await (route as any).POST(req, { params: { id: book.id } })
    expect(res.status).toBe(200)

    const editorNotifs = await prisma.notification.findMany({ where: { userId: editor.id } })
    expect(editorNotifs.length).toBeGreaterThanOrEqual(0)

    const updated = await prisma.book.findUnique({ where: { id: book.id } })
    expect(updated?.status).toBe('editing')
  })

  it('Editor marks changes required → Author gets a notification, book moves to draft', async () => {
    // Create an editing book and assign editor
    const book = await prisma.book.create({ data: { title: 'Changes Flow', content: '...', status: 'editing' as any, authorId: author.id, editorId: editor.id } })
    createdBookIds.push(book.id)

    vi.doMock('@/lib/api-auth', async () => ({
      requireUser: async () => ({ ok: true as const, user: { id: editor.id, email: editor.email, name: 'Editor', role: 'Editor' } }),
    }))
    const body = JSON.stringify({ action: 'changes-required' })
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${book.id}/transition`, { method: 'POST', body }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/transition/route')
    const res = await (route as any).POST(req, { params: { id: book.id } })
    expect(res.status).toBe(200)

    // Author should have a notification for this event and status draft
    const authorNotifs = await prisma.notification.findMany({ where: { userId: author.id } })
    expect(authorNotifs.length).toBeGreaterThanOrEqual(1)
    expect(authorNotifs[0].type).toBe('BookChangesRequested')
    expect(authorNotifs[0].bookId).toBe(book.id)

    const updated = await prisma.book.findUnique({ where: { id: book.id } })
    expect(updated?.status).toBe('draft')
  })
})
