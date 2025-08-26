import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'
// route will be dynamically imported after mocking requireUser in each test

function randomEmail(prefix: string) {
  const id = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${id}@example.test`
}

const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

maybe(!!dbUrl)('Unified transition endpoint', () => {
  let author: { id: string; email: string }
  let otherAuthor: { id: string; email: string }
  let reader: { id: string; email: string }
  let draftId = ''

  beforeAll(async () => {
    author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'Author', role: 'Author' as any } })
    otherAuthor = await prisma.user.create({ data: { email: randomEmail('author2'), name: 'Other Author', role: 'Author' as any } })
    reader = await prisma.user.create({ data: { email: randomEmail('reader'), name: 'Reader', role: 'Reader' as any } })
  })

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: [author.id, otherAuthor.id, reader.id] } } })
    await prisma.bookEventOutbox.deleteMany({ where: { processedAt: null } })
    await prisma.book.deleteMany({ where: { authorId: { in: [author.id, otherAuthor.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [author.id, otherAuthor.id, reader.id] } } })
  })

  beforeEach(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: [author.id, otherAuthor.id, reader.id] } } })
    await prisma.bookEventOutbox.deleteMany({ where: { processedAt: null } })
    const draft = await prisma.book.create({ data: { title: 'Draft', content: '...', status: 'draft' as any, authorId: author.id } })
    draftId = draft.id
  })

  it('happy path: Author can submit draft → editing', async () => {
    vi.doMock('@/lib/api-auth', async () => ({
      requireUser: async () => ({ ok: true as const, user: { id: author.id, email: author.email, name: 'Author', role: 'Author' } }),
    }))
    const body = JSON.stringify({ action: 'submit' })
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${draftId}/transition`, { method: 'POST', body }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/transition/route')
    const res = await (route as any).POST(req, { params: { id: draftId } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({ ok: true, bookId: draftId, from: 'draft', to: 'editing' })
    const book = await prisma.book.findUnique({ where: { id: draftId } })
    expect(book?.status).toBe('editing')
  })

  it('forbidden: Reader cannot submit', async () => {
    vi.doMock('@/lib/api-auth', async () => ({
      requireUser: async () => ({ ok: true as const, user: { id: reader.id, email: reader.email, name: 'Reader', role: 'Reader' } }),
    }))
    const body = JSON.stringify({ action: 'submit' })
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${draftId}/transition`, { method: 'POST', body }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/transition/route')
    const res = await (route as any).POST(req, { params: { id: draftId } })
    expect(res.status).toBe(403)
  })

  it('conflict: submitting a book already editing returns 409', async () => {
    await prisma.book.update({ where: { id: draftId }, data: { status: 'editing' as any } })
    vi.doMock('@/lib/api-auth', async () => ({
      requireUser: async () => ({ ok: true as const, user: { id: author.id, email: author.email, name: 'Author', role: 'Author' } }),
    }))
    const body = JSON.stringify({ action: 'submit' })
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${draftId}/transition`, { method: 'POST', body }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/transition/route')
    const res = await (route as any).POST(req, { params: { id: draftId } })
    expect(res.status).toBe(409)
  })

  it("ownership: Author cannot submit someone else's draft", async () => {
    const otherDraft = await prisma.book.create({ data: { title: 'Other Draft', content: '...', status: 'draft' as any, authorId: otherAuthor.id } })
    vi.doMock('@/lib/api-auth', async () => ({
      requireUser: async () => ({ ok: true as const, user: { id: author.id, email: author.email, name: 'Author', role: 'Author' } }),
    }))
    const body = JSON.stringify({ action: 'submit' })
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${otherDraft.id}/transition`, { method: 'POST', body }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/transition/route')
        const res = await (route as any).POST(req, { params: { id: otherDraft.id } })
    expect(res.status).toBe(403)
  })
})
