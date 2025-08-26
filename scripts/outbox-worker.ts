import prisma from '@/lib/prisma'
import { publishToRole, publishToUser } from '@/lib/sse'

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

export async function processOutboxBatch(batchSize = 50) {
  const events = await prisma.bookEventOutbox.findMany({
    where: { processedAt: null },
    orderBy: { occurredAt: 'asc' },
    take: batchSize,
  })
  for (const ev of events) {
    const type = ev.type
    const payload: any = ev.payload as any
    const bookId: string | undefined = payload?.bookId
    const eventId: string | undefined = payload?.eventId || ev.id // fallback
    try {
      if (!bookId) {
        console.warn('Outbox event missing bookId', ev.id)
        await prisma.bookEventOutbox.update({ where: { id: ev.id }, data: { processedAt: new Date() } })
        continue
      }
      const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, authorId: true, title: true } })
      if (!book) {
        await prisma.bookEventOutbox.update({ where: { id: ev.id }, data: { processedAt: new Date() } })
        continue
      }

      let recipients: { id: string; role: string }[] = []
      if (type === 'BookSubmitted') {
        recipients = await prisma.user.findMany({ where: { role: 'Editor' }, select: { id: true, role: true } })
      } else if (type === 'BookMarkedReady' || type === 'BookReady') {
        recipients = await prisma.user.findMany({ where: { role: 'Publisher' }, select: { id: true, role: true } })
      } else if (type === 'BookPublished') {
        recipients = await prisma.user.findMany({ where: { id: book.authorId }, select: { id: true, role: true } })
      } else if (type === 'BookChangesRequested') {
        recipients = await prisma.user.findMany({ where: { id: book.authorId }, select: { id: true, role: true } })
      } else if (type === 'BookNotReady') {
        recipients = await prisma.user.findMany({ where: { role: 'Editor' }, select: { id: true, role: true } })
      } else {
        // ignore other event types for notifications
        await prisma.bookEventOutbox.update({ where: { id: ev.id }, data: { processedAt: new Date() } })
        continue
      }

      if (recipients.length > 0) {
        const createdAt = new Date()
        // Create notifications idempotently (unique on userId,eventId)
        await prisma.$transaction(async (tx) => {
          for (const r of recipients) {
            await tx.notification.create({
              data: {
                userId: r.id,
                type,
                bookId: book.id,
                title: type === 'BookPublished' ? `Published: ${book.title}` : type === 'BookMarkedReady' || type === 'BookReady' ? `Ready: ${book.title}` : type === 'BookChangesRequested' ? `Changes requested: ${book.title}` : `Submitted: ${book.title}`,
                body: type === 'BookPublished' ? 'Your book is now published.' : type === 'BookMarkedReady' || type === 'BookReady' ? 'A book is ready for publishing.' : type === 'BookChangesRequested' ? 'Your draft was returned for changes by an editor.' : 'A book was submitted for editing.',
                createdAt,
                eventId,
              },
            }).catch(() => {/* duplicate due to unique (userId,eventId) */})
          }
        })

        // Publish SSE events to recipients
        for (const r of recipients) {
          publishToUser(r.id, 'notification.created', { bookId: book.id, id: eventId, title: book.title, createdAt })
        }
      }
      await prisma.bookEventOutbox.update({ where: { id: ev.id }, data: { processedAt: new Date() } })
    } catch (e) {
      console.error('Worker error', { eventId: ev.id, type, bookId, error: (e as Error)?.message })
      // Leave as unprocessed for retry
    }
  }
}

async function main() {
  console.log('[worker] Starting outbox worker…')
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await processOutboxBatch(50)
    await sleep(1000)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
