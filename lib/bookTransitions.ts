import prisma from '@/lib/prisma'
import { publishToRole, publishToUser } from '@/lib/sse'
import { TRANSITIONS, type Action } from './bookState'

export type Actor = { id: string; role: string }

export async function performTransition({ tx, bookId, actor, action }: {
  tx: typeof prisma
  bookId: string
  actor: Actor
  action: Action
}) {
  const cfg = TRANSITIONS[action]
  if (!cfg) {
    const err: any = new Error('Invalid action')
    err.status = 400
    throw err
  }

  // role check
  if (!cfg.roles.includes(actor.role as any)) {
    const err: any = new Error('Forbidden')
    err.status = 403
    throw err
  }

  const book = await tx.book.findUnique({ where: { id: bookId }, select: { id: true, authorId: true, status: true, title: true } })
  if (!book) {
    const err: any = new Error('Not found')
    err.status = 404
    throw err
  }

  if (cfg.ownership === 'author' && book.authorId !== actor.id) {
    const err: any = new Error('Forbidden')
    err.status = 403
    throw err
  }

  const from = cfg.from
  const to = cfg.to

  const where: any = { id: bookId, status: from }
  if (cfg.ownership === 'author') where.authorId = actor.id

  // data changes across transitions
  const data: any = { status: to }
  if (action === 'submit') {
    data.editorId = null
    data.publisherId = null
  }
  if (action === 'changes-required') {
    data.editorId = null
    data.publisherId = null
  }
  if (action === 'ready') {
    data.editorId = actor.id
  }
  if (action === 'not-ready') {
    data.publisherId = null
  }
  if (action === 'publish') {
    data.publisherId = actor.id
  }

  const update = await tx.book.updateMany({ where, data })
  if (update.count === 0) {
    const err: any = new Error('Conflict')
    err.status = 409
    throw err
  }

  const eventId = crypto.randomUUID()
  await tx.bookEventOutbox.create({
    data: {
      type: cfg.outboxType,
      payload: { action, eventId, bookId, actorId: actor.id, from, to, occurredAt: new Date().toISOString() },
      occurredAt: new Date(),
    },
  })

  // Immediate notifications (idempotent)
  const notifyTargets = cfg.notify({ id: book.id, authorId: book.authorId })
  const createdAt = new Date()

  // Determine recipients by role bucket or direct user id
  const userIds: string[] = []
  const wantsEditors = notifyTargets.includes('Editors' as any)
  const wantsPublishers = notifyTargets.includes('Publishers' as any)
  if (wantsEditors) {
    const editors = await tx.user.findMany({ where: { role: 'Editor' as any }, select: { id: true } })
    userIds.push(...editors.map(e => e.id))
  }
  if (wantsPublishers) {
    const pubs = await tx.user.findMany({ where: { role: 'Publisher' as any }, select: { id: true } })
    userIds.push(...pubs.map(p => p.id))
  }
  for (const t of notifyTargets) {
    if (t !== 'Editors' && t !== 'Publishers') userIds.push(t)
  }

  if (userIds.length) {
    await tx.notification.createMany({
      data: userIds.map(uid => ({
        userId: uid,
        type: cfg.outboxType,
        bookId,
        title: cfg.outboxType === 'BookPublished' ? `Published: ${book.title}` : cfg.outboxType === 'BookMarkedReady' ? `Ready: ${book.title}` : cfg.outboxType === 'BookChangesRequested' ? `Changes requested: ${book.title}` : cfg.outboxType === 'BookNotReady' ? `Not ready: ${book.title}` : `Submitted: ${book.title}`,
        body: cfg.outboxType === 'BookPublished' ? 'Your book is now published.' : cfg.outboxType === 'BookMarkedReady' ? 'A book is ready for publishing.' : cfg.outboxType === 'BookChangesRequested' ? 'Your draft was returned for changes by an editor.' : cfg.outboxType === 'BookNotReady' ? 'A book was returned to editing by the publisher.' : 'A book was submitted for editing.',
        createdAt,
        eventId,
      })),
      skipDuplicates: true,
    })
  }

  // SSE publishes for book status change and notifications
  const payload = { bookId, from, to }
  if (action === 'submit') publishToRole('Editor', 'books.statusChanged', payload)
  if (action === 'ready') publishToRole('Publisher', 'books.statusChanged', payload)
  if (action === 'publish') publishToUser(book.authorId, 'books.statusChanged', payload)
  if (action === 'changes-required') publishToUser(book.authorId, 'books.statusChanged', payload)
  if (action === 'not-ready') publishToRole('Editor', 'books.statusChanged', payload)

  if (userIds.length) {
    const notifEvent = { id: eventId, title: 'Notification', bookId, createdAt: createdAt.toISOString() }
    // Emit to exact users
    for (const uid of userIds) {
      publishToUser(uid, 'notification.created', notifEvent)
    }
  }

  return { ok: true as const, bookId, from, to }
}
