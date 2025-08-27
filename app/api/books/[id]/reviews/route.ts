import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'

// Simple in-memory token bucket for rate limiting review submissions
const reviewBucket: Map<string, { tokens: number; updatedAt: number }> = new Map()
const RATE_LIMIT_TOKENS = 3
const RATE_LIMIT_WINDOW_MS = 60_000

function allowReview(userId: string) {
  const now = Date.now()
  const entry = reviewBucket.get(userId) || { tokens: RATE_LIMIT_TOKENS, updatedAt: now }
  // Refill based on elapsed time
  const elapsed = now - entry.updatedAt
  const refill = Math.floor(elapsed / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_TOKENS
  entry.tokens = Math.min(RATE_LIMIT_TOKENS, entry.tokens + refill)
  entry.updatedAt = now
  if (entry.tokens <= 0) {
    reviewBucket.set(userId, entry)
    return false
  }
  entry.tokens -= 1
  reviewBucket.set(userId, entry)
  return true
}

// GET /api/books/[id]/reviews (public for published books)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  const book = await prisma.book.findUnique({ where: { id }, select: { status: true } })
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (book.status !== 'published') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = new URL(req.url)
  const limitParam = parseInt(url.searchParams.get('limit') || '20', 10)
  const limit = Math.max(1, Math.min(limitParam || 20, 50))
  const cursor = url.searchParams.get('cursor') // createdAt,id

  let cursorCreatedAt: Date | undefined
  let cursorId: string | undefined
  if (cursor) {
    const parts = cursor.split(',')
    if (parts.length === 2) {
      cursorCreatedAt = new Date(parts[0])
      cursorId = parts[1]
    }
  }

  const rows = await prisma.review.findMany({
    where: { bookId: id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(cursorCreatedAt && cursorId ? { cursor: { createdAt: cursorCreatedAt, id: cursorId }, skip: 1 } : {}),
    take: limit,
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      reader: { select: { id: true, name: true } },
    },
  })
  const items = rows.map(r => ({ id: r.id, readerId: r.reader.id, readerName: r.reader.name, rating: r.rating, body: r.body, createdAt: r.createdAt }))
  const nextCursor = rows.length === limit ? `${rows[rows.length - 1].createdAt.toISOString()},${rows[rows.length - 1].id}` : null
  return NextResponse.json({ items, nextCursor })
}

// POST /api/books/[id]/reviews (auth: Reader, published only)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth
  if (user.role !== 'Reader') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  const book = await prisma.book.findUnique({ where: { id }, select: { status: true } })
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (book.status !== 'published') return NextResponse.json({ error: 'Conflict' }, { status: 409 })

  // Rate limiting
  if (!allowReview(user.id)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const bodyJson = await req.json().catch(() => null)
  const rating = bodyJson?.rating
  const text = bodyJson?.body
  if (typeof rating !== 'number' || rating < 1 || rating > 5 || !text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Prevent duplicates even if the DB migration isn't applied yet
  const existing = await prisma.review.findFirst({ where: { bookId: id, readerId: user.id } })
  if (existing) return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })

  const review = await prisma.review.create({
    data: {
      bookId: id,
      readerId: user.id,
      rating,
      body: text,
    },
    select: { id: true, rating: true, body: true, createdAt: true },
  })
  return NextResponse.json(review, { status: 201 })
}
