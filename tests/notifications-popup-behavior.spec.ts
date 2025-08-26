import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Regression tests that assert popup closes on mark all read and supports click-away behavior.

describe('Notifications popup behavior in AppShell', () => {
  const file = resolve(__dirname, '../components/app-shell.tsx')
  const src = readFileSync(file, 'utf8')

  it('markAllRead closes the popup via setOpenNotif(false)', () => {
    // Look for markAllRead and a call to setOpenNotif(false)
    const hasClose = /function\s+markAllRead\s*\([\s\S]*?setOpenNotif\(false\)/.test(src)
    expect(hasClose).toBe(true)
  })

  it('adds a document listener to close on outside click when openNotif is true', () => {
    // We expect a useEffect that depends on openNotif and adds a document listener
    const hasUseEffect = /useEffect\(\(\)\s*=>\s*{[\s\S]*openNotif[\s\S]*document\.addEventListener\(\'mousedown\'|\"mousedown\"/.test(src)
    expect(hasUseEffect).toBe(true)
    // Ensure it checks ref containment and calls setOpenNotif(false)
    const hasContainCheck = /notifRef\.current[\s\S]*!el\.contains\(e\.target as Node\)[\s\S]*setOpenNotif\(false\)/.test(src)
    expect(hasContainCheck).toBe(true)
    // Ensure cleanup removes the listener
    const hasCleanup = /return\s*\(\)\s*=>\s*document\.removeEventListener\(\'mousedown\'|\"mousedown\"/.test(src)
    expect(hasCleanup).toBe(true)
  })
})
