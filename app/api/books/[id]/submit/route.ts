import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireUser, assertRole } from '@/lib/api-auth'
import { publishToRole } from '@/lib/sse'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireUser()
  if (!result.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user } = result
  if (!assertRole(user, 'Author').ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id

  let eventId = ''
  try {
    await prisma.$transaction(async (tx) => {
      const update = await tx.book.updateMany({
        where: { id, authorId: user.id, status: 'draft' },
        data: { status: 'editing', editorId: null, publisherId: null },
      })
      if (update.count === 0) {
        throw new Error('conflict')
      }
      eventId = crypto.randomUUID()
      await tx.bookEventOutbox.create({
        data: {
          type: 'BookSubmitted',
          payload: { eventId, bookId: id, actorId: user.id, from: 'draft', to: 'editing', occurredAt: new Date().toISOString() },
          occurredAt: new Date(),
        },
      })
    })
  } catch (e) {
    return NextResponse.json({ error: 'Conflict' }, { status: 409 })
  }

  // Notify Editors that a book moved to editing
  publishToRole('Editor', 'books.statusChanged', { bookId: id, from: 'draft', to: 'editing' })

  // Create notifications immediately for Editors and emit SSE
  const editors = await prisma.user.findMany({ where: { role: 'Editor' }, select: { id: true } })
  const book = await prisma.book.findUnique({ where: { id }, select: { title: true } })
  const title = book?.title || 'A book'
  if (editors.length) {
    await prisma.notification.createMany({
      data: editors.map((e) => ({
        userId: e.id,
        type: 'BookSubmitted',
        bookId: id,
        title: `Submitted: ${title}`,
        body: 'A book was submitted for editing.',
        createdAt: new Date(),
        eventId,
      })),
      skipDuplicates: true,
    })
    // Emit SSE to all Editors
    publishToRole('Editor', 'notification.created', { id: eventId, title: `Submitted: ${title}`, bookId: id, createdAt: new Date().toISOString() })
  }

  return NextResponse.json({ ok: true })
}
