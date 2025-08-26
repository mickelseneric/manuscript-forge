import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser, assertRole } from '@/lib/api-auth'
import { publishToUser } from '@/lib/sse'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result
  if (!assertRole(user, 'Publisher').ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id

  let eventId = ''
  try {
    await prisma.$transaction(async (tx) => {
      const update = await tx.book.updateMany({
        where: {
          id,
          status: 'ready',
          OR: [{ publisherId: user.id }, { publisherId: null }],
        },
        data: { status: 'published', publisherId: user.id },
      })
      if (update.count === 0) {
        throw new Error('conflict')
      }
      eventId = crypto.randomUUID()
      await tx.bookEventOutbox.create({
        data: {
          type: 'BookPublished',
          payload: { eventId, bookId: id, actorId: user.id, from: 'ready', to: 'published', occurredAt: new Date().toISOString() },
          occurredAt: new Date(),
        },
      })
    })
  } catch (e) {
    return NextResponse.json({ error: 'Conflict' }, { status: 409 })
  }

  // Notify Author that their book published
  // Find authorId to target the correct user
  const book = await prisma.book.findUnique({ where: { id }, select: { authorId: true, title: true } })
  if (book) {
    publishToUser(book.authorId, 'books.statusChanged', { bookId: id, from: 'ready', to: 'published' })
    // Create notification immediately for Author and emit SSE
    await prisma.notification.createMany({
      data: [{
        userId: book.authorId,
        type: 'BookPublished',
        bookId: id,
        title: `Published: ${book.title}`,
        body: 'Your book is now published.',
        createdAt: new Date(),
        eventId,
      }],
      skipDuplicates: true,
    })
    publishToUser(book.authorId, 'notification.created', { id: eventId, title: `Published: ${book.title}`, bookId: id, createdAt: new Date().toISOString() })
  }
  return NextResponse.json({ ok: true })
}
