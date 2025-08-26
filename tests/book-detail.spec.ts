import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import * as route from '@/app/api/books/[id]/route'

function randomEmail(prefix: string) {
  const id = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${id}@example.test`
}

// Guard tests if DATABASE_URL is not configured
const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

maybe(!!dbUrl)('Reader can fetch a published book via API (supports /book/[id] page)', () => {
  let authorId = ''
  let readerId = ''
  let bookId = ''

  // Mock requireUser to simulate an authenticated Reader (avoid capturing outer variables)
  vi.mock('@/lib/api-auth', async () => {
    return {
      requireUser: async () => ({ ok: true as const, user: { id: 'reader-id', email: 'reader@test', name: 'Reader', role: 'Reader' } }),
      assertRole: (user: { role: string }, roles: string[] | string) => ({ ok: (Array.isArray(roles) ? roles : [roles]).includes(user.role) } ? { ok: true as const } : { ok: false as const, status: 403 as const }),
    }
  })

  beforeAll(async () => {
    const author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'Author X', role: 'Author' as any } })
    const reader = await prisma.user.create({ data: { email: randomEmail('reader'), name: 'Reader Y', role: 'Reader' as any } })
    authorId = author.id
    readerId = reader.id
  })

  afterAll(async () => {
    if (bookId) await prisma.book.deleteMany({ where: { id: bookId } })
    await prisma.user.deleteMany({ where: { id: { in: [authorId, readerId].filter(Boolean) as string[] } } })
  })

  beforeEach(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: [readerId] } } })
  })

  it('returns book JSON for a published book', async () => {
    // Arrange: create a published book
    const book = await prisma.book.create({
      data: { title: 'Public Book', content: 'Visible to readers', status: 'published' as any, authorId },
      select: { id: true },
    })
    bookId = book.id

    // Act: call the route handler as the reader
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${bookId}`))
    const res = await (route as any).GET(req, { params: { id: bookId } })

    // Assert
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toMatchObject({ id: bookId, title: 'Public Book', status: 'published' })
    expect(typeof data.content).toBe('string')
  })
})
