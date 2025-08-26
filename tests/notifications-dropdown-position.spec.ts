import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Regression test: ensure notifications dropdown is right-aligned and not using left-2

describe('Notifications dropdown positioning', () => {
  const file = resolve(__dirname, '../components/app-shell.tsx')
  const src = readFileSync(file, 'utf8')

  it('uses right-0 top-full and not left-2 on the dropdown container', () => {
    // Look for the menu container line
    expect(src.includes('role="menu" aria-label="Notifications"')).toBe(true)
    // Should include right-0 and top-full
    expect(src.includes('right-0')).toBe(true)
    expect(src.includes('top-full')).toBe(true)
    // Should not include the previous left-2 anchor
    expect(src.includes('left-2')).toBe(false)
  })
})
