import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser, assertRole } from '@/lib/api-auth'
import { Prisma } from '@prisma/client'

function parseStatus(param?: string | null): 'draft' | 'editing' | 'ready' | 'published' | undefined {
  if (!param) return undefined
  if (param === 'draft' || param === 'editing' || param === 'ready' || param === 'published') return param
  return undefined
}

export async function GET(req: NextRequest) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result

  const url = new URL(req.url)
  const statusParam = parseStatus(url.searchParams.get('status'))

  let where: Prisma.BookWhereInput = {}
  switch (user.role) {
    case 'Author':
      where = { authorId: user.id, ...(statusParam ? { status: statusParam } : {}) }
      break
    case 'Editor':
      where = { status: 'editing' }
      break
    case 'Publisher':
      where = { status: 'ready' }
      break
    case 'Reader':
      where = { status: 'published' }
      break
    default:
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const books = await prisma.book.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      authorId: true,
      editorId: true,
      publisherId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(books)
}

export async function POST(req: NextRequest) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result
  if (!assertRole(user, 'Author').ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const title = body?.title
  const content = body?.content
  if (!title || !content || typeof title !== 'string' || typeof content !== 'string') {
    return NextResponse.json({ error: 'title and content are required' }, { status: 400 })
  }

  const book = await prisma.book.create({
    data: {
      title,
      content,
      status: 'draft',
      authorId: user.id,
    },
    select: { id: true, title: true, status: true, authorId: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json(book, { status: 201 })
}
