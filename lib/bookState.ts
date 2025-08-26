import type { Prisma } from '@prisma/client'

export type BookStatus = 'draft'|'editing'|'ready'|'published'
export type Role = 'Author'|'Editor'|'Publisher'|'Reader'
export type Action = 'submit'|'ready'|'publish'|'changes-required'|'not-ready'

export type TransitionConfig = {
  from: BookStatus
  to: BookStatus
  roles: Role[]
  // 'author' means only the author may perform; null means no ownership restriction
  ownership: 'author' | null
  // Recipients to notify. Returns either user IDs or role buckets
  notify: (book: { id: string; authorId: string }) => (string | 'Editors' | 'Publishers')[]
  // Canonical outbox type string for this transition
  outboxType: 'BookSubmitted' | 'BookMarkedReady' | 'BookPublished' | 'BookChangesRequested' | 'BookNotReady'
}

export const TRANSITIONS: Record<Action, TransitionConfig> = {
  submit: {
    from: 'draft',
    to: 'editing',
    roles: ['Author'],
    ownership: 'author',
    notify: (book) => ['Editors'],
    outboxType: 'BookSubmitted',
  },
  'changes-required': {
    from: 'editing',
    to: 'draft',
    roles: ['Editor'],
    ownership: null,
    notify: (book) => [book.authorId],
    outboxType: 'BookChangesRequested',
  },
  ready: {
    from: 'editing',
    to: 'ready',
    roles: ['Editor'],
    ownership: null,
    notify: () => ['Publishers'],
    outboxType: 'BookMarkedReady',
  },
  'not-ready': {
    from: 'ready',
    to: 'editing',
    roles: ['Publisher'],
    ownership: null,
    notify: () => ['Editors'],
    outboxType: 'BookNotReady',
  },
  publish: {
    from: 'ready',
    to: 'published',
    roles: ['Publisher'],
    ownership: null,
    notify: (book) => [book.authorId],
    outboxType: 'BookPublished',
  },
}
