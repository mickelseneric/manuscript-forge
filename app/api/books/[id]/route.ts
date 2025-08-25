import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser, assertRole } from '@/lib/api-auth'
import { Prisma } from '@prisma/client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result
  const id = params.id

  // Visibility rules
  let where: Prisma.BookWhereInput
  switch (user.role) {
    case 'Author':
      where = { id, authorId: user.id }
      break
    case 'Editor':
      where = { id, status: 'editing' }
      break
    case 'Publisher':
      where = { id, status: 'ready' }
      break
    case 'Reader':
      where = { id, status: 'published' }
      break
    default:
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const book = await prisma.book.findFirst({
    where,
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      authorId: true,
      editorId: true,
      publisherId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(book)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result
  if (!assertRole(user, 'Author').ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  const body = await req.json().catch(() => null)
  const title = body?.title
  const content = body?.content
  if ((!title && !content) || (title && typeof title !== 'string') || (content && typeof content !== 'string')) {
    return NextResponse.json({ error: 'title and/or content required' }, { status: 400 })
  }

  const updateData: Prisma.BookUpdateManyMutationInput = {}
  if (title) (updateData.title = title)
  if (content) (updateData.content = content)

  // Atomic conditional update: only author's own draft
  const res = await prisma.book.updateMany({
    where: { id, authorId: user.id, status: 'draft' },
    data: updateData,
  })
  if (res.count === 0) return NextResponse.json({ error: 'Conflict' }, { status: 409 })

  const book = await prisma.book.findUnique({
    where: { id },
    select: { id: true, title: true, content: true, status: true, authorId: true, updatedAt: true },
  })
  return NextResponse.json(book)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result
  if (!assertRole(user, 'Author').ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  // Atomic conditional delete: only author's own draft
  const res = await prisma.book.deleteMany({
    where: { id, authorId: user.id, status: 'draft' },
  })
  if (res.count === 0) return NextResponse.json({ error: 'Conflict' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
