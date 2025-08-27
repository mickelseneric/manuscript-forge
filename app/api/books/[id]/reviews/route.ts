import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/api-auth'

// GET /api/books/[id]/reviews
// Public for published books only; otherwise 404 to avoid leaking non-public books
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  const book = await prisma.book.findUnique({ where: { id }, select: { status: true } })
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (book.status !== 'published') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = await prisma.review.findMany({
    where: { bookId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      reader: { select: { id: true, name: true } },
    },
  })
  const items = rows.map(r => ({ id: r.id, readerId: r.reader.id, readerName: r.reader.name, rating: r.rating, body: r.body, createdAt: r.createdAt }))
  return NextResponse.json({ items })
}

// POST /api/books/[id]/reviews
// Requires authentication (Reader role) and the book must be published
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = auth
  if (user.role !== 'Reader') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  const book = await prisma.book.findUnique({ where: { id }, select: { status: true } })
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (book.status !== 'published') return NextResponse.json({ error: 'Conflict' }, { status: 409 })

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
