import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function load(file: string) {
  return readFileSync(resolve(__dirname, '..', file), 'utf8')
}

describe('ARCHITECTURE.md erDiagram matches prisma schema (key assertions)', () => {
  const schema = load('prisma/schema.prisma')
  const arch = load('docs/ARCHITECTURE.md')

  it('has correct role enum and book status enum in ER diagram', () => {
    // Role enum in docs
    expect(arch).toMatch(/enum\s+role\s+"Author\|Editor\|Publisher\|Reader"/)
    // Book status enum in docs
    expect(arch).toMatch(/enum\s+status\s+"draft\|editing\|ready\|published"/)

    // Ensure schema lists the same variants
    expect(schema).toMatch(/enum\s+UserRole\s*{[\s\S]*Author[\s\S]*Editor[\s\S]*Publisher[\s\S]*Reader[\s\S]*}/)
    expect(schema).toMatch(/enum\s+BookStatus\s*{[\s\S]*draft[\s\S]*editing[\s\S]*ready[\s\S]*published[\s\S]*}/)
  })

  it('documents Review unique(bookId, readerId)', () => {
    expect(arch).toMatch(/REVIEW[\s\S]*unique\s+\(bookId,\s*readerId\)/i)
    expect(schema).toMatch(/@@unique\(\[bookId,\s*readerId\]\)/)
  })

  it('documents Notification idempotency and indexes', () => {
    // Unique (userId, eventId)
    expect(arch).toMatch(/NOTIFICATION[\s\S]*unique\s+\(userId,\s*eventId\)/i)
    expect(schema).toMatch(/@@unique\(\[userId,\s*eventId\]\)/)
    // Index (userId, readAt, createdAt)
    expect(arch).toMatch(/INDEX\(userId,\s*readAt,\s*createdAt\)/)
    expect(schema).toMatch(/@@index\(\[userId,\s*readAt,\s*createdAt\]\)/)
    // eventId field exists in docs and schema
    expect(arch).toMatch(/eventId/i)
    expect(schema).toMatch(/eventId\s+String/)
  })

  it('documents Outbox fields and no direct bookId FK', () => {
    // Outbox entity exists with required fields
    expect(arch).toMatch(/BOOK_EVENT_OUTBOX[\s\S]*type[\s\S]*payload[\s\S]*occurredAt[\s\S]*processedAt/i)
    // Ensure the docs note that bookId is not a FK on the table
    expect(arch).toMatch(/Outbox.*does not.*bookId.*payload/i)
    // Schema has BookEventOutbox with payload Json
    expect(schema).toMatch(/model\s+BookEventOutbox[\s\S]*payload\s+Json/)
  })

  it('documents key relationships', () => {
    // User to Book (author)
    expect(arch).toMatch(/USER\s+\|\|--o\{\s+BOOK\s+:\s+"authorId/i)
    // User to Review (readerId)
    expect(arch).toMatch(/USER\s+\|\|--o\{\s+REVIEW\s+:\s+"readerId/i)
    // Book to Review (bookId)
    expect(arch).toMatch(/BOOK\s+\|\|--o\{\s+REVIEW\s+:\s+"bookId/i)
    // Book to Notification (bookId)
    expect(arch).toMatch(/BOOK\s+\|\|--o\{\s+NOTIFICATION\s+:\s+"bookId/i)
    // User to Notification (userId)
    expect(arch).toMatch(/USER\s+\|\|--o\{\s+NOTIFICATION\s+:\s+"userId/i)
  })
})
