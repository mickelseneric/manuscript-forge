import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import prisma from '@/lib/prisma'
import * as reviewsRoute from '@/app/api/books/[id]/reviews/route'
import { NextRequest } from 'next/server'

function randomEmail(prefix: string) {
  const id = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${id}@example.test`
}

const dbUrl = process.env.DATABASE_URL
const maybe = (cond: boolean) => (cond ? describe : describe.skip)

maybe(!!dbUrl)('Book reviews API', () => {
  let authorId = ''
  let readerId = ''
  let editorId = ''
  let draftId = ''
  let publishedId = ''

  beforeAll(async () => {
    const author = await prisma.user.create({ data: { email: randomEmail('author'), name: 'Author R', role: 'Author' as any } })
    const reader = await prisma.user.create({ data: { email: randomEmail('reader'), name: 'Reader R', role: 'Reader' as any } })
    const editor = await prisma.user.create({ data: { email: randomEmail('editor'), name: 'Editor R', role: 'Editor' as any } })
    authorId = author.id; readerId = reader.id; editorId = editor.id
    const draft = await prisma.book.create({ data: { title: 'Draft Book', content: '...', status: 'draft' as any, authorId } })
    const pub = await prisma.book.create({ data: { title: 'Published Book', content: '...', status: 'published' as any, authorId } })
    draftId = draft.id; publishedId = pub.id
  })

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { bookId: { in: [draftId, publishedId].filter(Boolean) as string[] } } })
    await prisma.book.deleteMany({ where: { id: { in: [draftId, publishedId].filter(Boolean) as string[] } } })
    await prisma.user.deleteMany({ where: { id: { in: [authorId, readerId, editorId].filter(Boolean) as string[] } } })
  })

  it('Public GET returns reviews for published and 404 for non-published', async () => {
    // Initially, there are no reviews
    const reqPub = new NextRequest(new Request(`http://localhost:3000/api/books/${publishedId}/reviews`))
    const resPub = await (reviewsRoute as any).GET(reqPub, { params: { id: publishedId } })
    expect(resPub.status).toBe(200)
    const dataPub = await resPub.json()
    expect(Array.isArray(dataPub.items)).toBe(true)

    const reqDraft = new NextRequest(new Request(`http://localhost:3000/api/books/${draftId}/reviews`))
    const resDraft = await (reviewsRoute as any).GET(reqDraft, { params: { id: draftId } })
    expect(resDraft.status).toBe(404)
  })

  it('POST requires auth (401 when unauthenticated)', async () => {
    // Mock requireUser to unauthenticated
    vi.doMock('@/lib/api-auth', async () => ({ requireUser: async () => ({ ok: false as const, status: 401 as const }) }))
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${publishedId}/reviews`, { method: 'POST', body: JSON.stringify({ rating: 5, body: 'Nice!' }) }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/reviews/route')
    const res = await (route as any).POST(req, { params: { id: publishedId } })
    expect(res.status).toBe(401)
  })

  it('POST only allows Reader role, rejects others with 403', async () => {
    vi.doMock('@/lib/api-auth', async () => ({ requireUser: async () => ({ ok: true as const, user: { id: editorId, email: 'e', name: 'E', role: 'Editor' } }) }))
    const req = new NextRequest(new Request(`http://localhost:3000/api/books/${publishedId}/reviews`, { method: 'POST', body: JSON.stringify({ rating: 5, body: 'Great!' }) }))
    vi.resetModules(); const route = await import('@/app/api/books/[id]/reviews/route')
    const res = await (route as any).POST(req, { params: { id: publishedId } })
    expect(res.status).toBe(403)
  })

  it('Reader can post one review; second attempt gets 409; posting to draft gets 409', async () => {
    // Reader auth
    vi.doMock('@/lib/api-auth', async () => ({ requireUser: async () => ({ ok: true as const, user: { id: readerId, email: 'r', name: 'Reader R', role: 'Reader' } }) }))
    const body = JSON.stringify({ rating: 4, body: 'Solid book.' })
    const req1 = new NextRequest(new Request(`http://localhost:3000/api/books/${publishedId}/reviews`, { method: 'POST', body }))
    vi.resetModules(); let route = await import('@/app/api/books/[id]/reviews/route')
    const res1 = await (route as any).POST(req1, { params: { id: publishedId } })
    expect(res1.status).toBe(201)

    // Duplicate
    const req2 = new NextRequest(new Request(`http://localhost:3000/api/books/${publishedId}/reviews`, { method: 'POST', body }))
    vi.resetModules(); route = await import('@/app/api/books/[id]/reviews/route')
    const res2 = await (route as any).POST(req2, { params: { id: publishedId } })
    expect(res2.status).toBe(409)

    // Draft should 409 (not published)
    const req3 = new NextRequest(new Request(`http://localhost:3000/api/books/${draftId}/reviews`, { method: 'POST', body }))
    vi.resetModules(); route = await import('@/app/api/books/[id]/reviews/route')
    const res3 = await (route as any).POST(req3, { params: { id: draftId } })
    expect(res3.status).toBe(409)
  })
})
