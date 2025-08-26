import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Regression test: ensure the send-back actions close the dialog on success

describe('Dialog closes after send-back transitions', () => {
  const file = resolve(__dirname, '../app/dashboard/client.tsx')
  const src = readFileSync(file, 'utf8')

  it("EditorPanel 'changes-required' passes onSuccess that closes the dialog", () => {
    const editorIdx = src.indexOf('export function EditorPanel')
    expect(editorIdx).toBeGreaterThan(-1)
    const re = /transition\.mutate\(\{[^}]*action:\s*'changes-required'[\s\S]*?\},\s*\{[\s\S]*onSuccess:\s*\(\)\s*=>\s*setViewing\(null\)/
    expect(re.test(src)).toBe(true)
  })

  it("EditorPanel 'ready' (Submit to Publisher) passes onSuccess that closes the dialog", () => {
    const editorIdx = src.indexOf('export function EditorPanel')
    expect(editorIdx).toBeGreaterThan(-1)
    const re = /transition\.mutate\(\{[^}]*action:\s*'ready'[\s\S]*?\},\s*\{[\s\S]*onSuccess:\s*\(\)\s*=>\s*setViewing\(null\)/
    expect(re.test(src)).toBe(true)
  })

  it("PublisherPanel 'not-ready' passes onSuccess that closes the dialog", () => {
    const pubIdx = src.indexOf('export function PublisherPanel')
    expect(pubIdx).toBeGreaterThan(-1)
    const re = /transition\.mutate\(\{[^}]*action:\s*'not-ready'[\s\S]*?\},\s*\{[\s\S]*onSuccess:\s*\(\)\s*=>\s*setViewing\(null\)/
    expect(re.test(src)).toBe(true)
  })

  it("PublisherPanel 'publish' passes onSuccess that closes the dialog", () => {
    const pubIdx = src.indexOf('export function PublisherPanel')
    expect(pubIdx).toBeGreaterThan(-1)
    const re = /transition\.mutate\(\{[^}]*action:\s*'publish'[\s\S]*?\},\s*\{[\s\S]*onSuccess:\s*\(\)\s*=>\s*setViewing\(null\)/
    expect(re.test(src)).toBe(true)
  })
})
