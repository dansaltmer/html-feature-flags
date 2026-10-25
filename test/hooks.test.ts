import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useFeatureFlag, useFeatureFlagEnabled } from '../src/index.js'

const html = document.documentElement

/** Changes attributes on <html> and lets the MutationObserver deliver. */
async function update(change: () => void): Promise<void> {
  await act(async () => {
    change()
    await Promise.resolve()
  })
}

afterEach(() => {
  cleanup()
  for (const { name } of [...html.attributes]) html.removeAttribute(name)
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('useFeatureFlag', () => {
  test('returns undefined when the attribute is absent', () => {
    const { result } = renderHook(() => useFeatureFlag('beta'))
    expect(result.current).toBeUndefined()
  })

  test('reads data-flag-<name> with the name used as-is', () => {
    html.setAttribute('data-flag-search-typos', 'on')
    const { result } = renderHook(() => [
      useFeatureFlag('search-typos'),
      // No camelCase conversion
      useFeatureFlag('searchTypos'),
    ])
    expect(result.current).toEqual(['on', undefined])
  })

  test('matches names case-insensitively, like HTML attributes', () => {
    html.setAttribute('data-flag-beta', 'on')
    const { result } = renderHook(() => [
      useFeatureFlag('Beta'),
      useFeatureFlag('BETA'),
    ])
    expect(result.current).toEqual(['on', 'on'])
  })

  test('returns an empty string for a valueless attribute', () => {
    html.setAttribute('data-flag-beta', '')
    const { result } = renderHook(() => useFeatureFlag('beta'))
    expect(result.current).toBe('')
  })

  test('updates when the attribute is added, changed and removed', async () => {
    const { result } = renderHook(() => useFeatureFlag('beta'))

    await update(() => html.setAttribute('data-flag-beta', 'a'))
    expect(result.current).toBe('a')

    await update(() => html.setAttribute('data-flag-beta', 'b'))
    expect(result.current).toBe('b')

    await update(() => html.removeAttribute('data-flag-beta'))
    expect(result.current).toBeUndefined()
  })

  test('does not re-render for unrelated attribute changes', async () => {
    let renders = 0
    renderHook(() => {
      renders++
      return useFeatureFlag('beta')
    })
    const initial = renders

    await update(() => {
      html.setAttribute('data-flag-other', 'on')
      html.setAttribute('data-theme', 'dark')
      html.className = 'js'
    })
    expect(renders).toBe(initial)

    await update(() => html.setAttribute('data-flag-beta', 'on'))
    expect(renders).toBe(initial + 1)
  })

  test('does not touch the DOM on import', async () => {
    const before = document.body.innerHTML
    await import('../src/index.js')
    expect(document.body.innerHTML).toBe(before)
    expect(html.attributes).toHaveLength(0)
  })
})

describe('useFeatureFlagEnabled', () => {
  test.each([
    [null, false],
    ['enabled', true],
    ['Enabled', true],
    ['ENABLED', true],
    ['', false],
    ['on', false],
    ['true', false],
    [' enabled', false],
    ['disabled', false],
  ])('attribute value %j is enabled: %s', (value, expected) => {
    if (value !== null) html.setAttribute('data-flag-beta', value)
    const { result } = renderHook(() => useFeatureFlagEnabled('beta'))
    expect(result.current).toBe(expected)
  })

  test('updates when the flag changes', async () => {
    const { result } = renderHook(() => useFeatureFlagEnabled('beta'))
    expect(result.current).toBe(false)

    await update(() => html.setAttribute('data-flag-beta', 'enabled'))
    expect(result.current).toBe(true)

    await update(() => html.setAttribute('data-flag-beta', 'disabled'))
    expect(result.current).toBe(false)
  })

  test('does not re-render when the value changes but stays disabled', async () => {
    html.setAttribute('data-flag-beta', 'off')
    let renders = 0
    renderHook(() => {
      renders++
      return useFeatureFlagEnabled('beta')
    })
    const initial = renders

    await update(() => html.setAttribute('data-flag-beta', 'no'))
    expect(renders).toBe(initial)
  })
})

describe('observer lifecycle', () => {
  test('shares one observer and disconnects when the last hook unmounts', async () => {
    const created: MutationObserver[] = []
    const disconnect = vi.fn()
    vi.stubGlobal(
      'MutationObserver',
      class extends MutationObserver {
        constructor(callback: MutationCallback) {
          super(callback)
          created.push(this)
        }
        override disconnect() {
          disconnect()
          super.disconnect()
        }
      },
    )
    // Fresh module so the observer is created with the stub
    vi.resetModules()
    const fresh = await import('../src/index.js')

    const a = renderHook(() => fresh.useFeatureFlag('a'))
    const b = renderHook(() => fresh.useFeatureFlag('b'))
    const c = renderHook(() => fresh.useFeatureFlagEnabled('c'))
    expect(created).toHaveLength(1)

    a.unmount()
    b.unmount()
    expect(disconnect).not.toHaveBeenCalled()
    c.unmount()
    expect(disconnect).toHaveBeenCalledTimes(1)

    // Remounting reuses the observer and still receives updates
    const d = renderHook(() => fresh.useFeatureFlag('d'))
    await update(() => html.setAttribute('data-flag-d', 'on'))
    expect(d.result.current).toBe('on')
    expect(created).toHaveLength(1)
  })
})
