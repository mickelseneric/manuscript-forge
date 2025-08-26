import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// This lightweight test guards against regressions where transition.mutate is used
// without defining the hook instance in a panel component, which caused a runtime ReferenceError.

describe('Dashboard panels wire useTransitionBook()', () => {
  const file = resolve(__dirname, '../app/dashboard/client.tsx')
  const src = readFileSync(file, 'utf8')

  it('EditorPanel defines const transition = useTransitionBook()', () => {
    const editorIdx = src.indexOf('export function EditorPanel')
    expect(editorIdx).toBeGreaterThan(-1)
    const slice = src.slice(editorIdx, editorIdx + 500)
    expect(slice.includes('const transition = useTransitionBook()')).toBe(true)
  })

  it('PublisherPanel defines const transition = useTransitionBook()', () => {
    const pubIdx = src.indexOf('export function PublisherPanel')
    expect(pubIdx).toBeGreaterThan(-1)
    const slice = src.slice(pubIdx, pubIdx + 500)
    expect(slice.includes('const transition = useTransitionBook()')).toBe(true)
  })
})
