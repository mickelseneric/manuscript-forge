import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser, assertRole } from '@/lib/api-auth'
import { publishToUser } from '@/lib/sse'

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
        data: { status: 'draft', editorId: null, publisherId: null },
      })
      if (update.count === 0) {
        throw new Error('conflict')
      }
      eventId = crypto.randomUUID()
      await tx.bookEventOutbox.create({
        data: {
          type: 'BookChangesRequested',
          payload: { eventId, bookId: id, actorId: user.id, from: 'editing', to: 'draft', occurredAt: new Date().toISOString() },
          occurredAt: new Date(),
        },
      })
    })
  } catch (e) {
    return NextResponse.json({ error: 'Conflict' }, { status: 409 })
  }

  // Notify the Author that the book moved back to draft so their list and notifications update live
  const book = await prisma.book.findUnique({ where: { id }, select: { authorId: true, title: true } })
  if (book) {
    publishToUser(book.authorId, 'books.statusChanged', { bookId: id, from: 'editing', to: 'draft' })
    // Create notification immediately with idempotency
    await prisma.notification.createMany({
      data: [{
        userId: book.authorId,
        type: 'BookChangesRequested',
        bookId: id,
        title: `Changes requested: ${book.title}`,
        body: 'Your draft was returned for changes by an editor.',
        createdAt: new Date(),
        eventId,
      }],
      skipDuplicates: true,
    })
    publishToUser(book.authorId, 'notification.created', { id: eventId, title: `Changes requested: ${book.title}`, bookId: id, createdAt: new Date().toISOString() })
  }
  return NextResponse.json({ ok: true })
}
