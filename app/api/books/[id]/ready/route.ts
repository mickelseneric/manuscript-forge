import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser, assertRole } from '@/lib/api-auth'
import { publishToRole } from '@/lib/sse'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result
  if (!assertRole(user, 'Editor').ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id

  let eventId = ''
  try {
    await prisma.$transaction(async (tx) => {
      const update = await tx.book.updateMany({
        where: {
          id,
          status: 'editing',
          OR: [{ editorId: user.id }, { editorId: null }],
        },
        data: { status: 'ready', editorId: user.id },
      })
      if (update.count === 0) {
        throw new Error('conflict')
      }
      eventId = crypto.randomUUID()
      await tx.bookEventOutbox.create({
        data: {
          type: 'BookMarkedReady',
          payload: { eventId, bookId: id, actorId: user.id, from: 'editing', to: 'ready', occurredAt: new Date().toISOString() },
          occurredAt: new Date(),
        },
      })
    })
  } catch (e) {
    return NextResponse.json({ error: 'Conflict' }, { status: 409 })
  }

  // Notify Publishers that a book moved to ready
  publishToRole('Publisher', 'books.statusChanged', { bookId: id, from: 'editing', to: 'ready' })

  // Create notifications immediately for Publishers and emit SSE
  const publishers = await prisma.user.findMany({ where: { role: 'Publisher' }, select: { id: true } })
  const book = await prisma.book.findUnique({ where: { id }, select: { title: true } })
  const title = book?.title || 'A book'
  if (publishers.length) {
    await prisma.notification.createMany({
      data: publishers.map((p) => ({
        userId: p.id,
        type: 'BookMarkedReady',
        bookId: id,
        title: `Ready: ${title}`,
        body: 'A book is ready for publishing.',
        createdAt: new Date(),
        eventId,
      })),
      skipDuplicates: true,
    })
    publishToRole('Publisher', 'notification.created', { id: eventId, title: `Ready: ${title}`, bookId: id, createdAt: new Date().toISOString() })
  }

  return NextResponse.json({ ok: true })
}
