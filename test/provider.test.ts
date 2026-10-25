import { act, cleanup, render } from '@testing-library/react'
import { createElement, memo, StrictMode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import {
  FeatureFlagsProvider,
  useFeatureFlag,
  useFeatureFlagEnabled,
  type FeatureFlags,
} from '../src/index.js'

const html = document.documentElement
let renders: string[] = []

function Flags() {
  const text = `${useFeatureFlag('beta') ?? 'unset'}:${String(useFeatureFlagEnabled('beta'))}`
  renders.push(text)
  return createElement('p', null, text)
}

/** Client-only render (no server HTML) of `<Flags>` under a provider. */
function renderWith(flags: FeatureFlags) {
  renders = []
  return render(
    createElement(FeatureFlagsProvider, { flags }, createElement(Flags)),
  )
}

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
  vi.restoreAllMocks()
})

test('client-only: first render uses the provider, with no re-render', async () => {
  renderWith({ beta: 'enabled' })
  await update(() => {})
  expect(renders).toEqual(['enabled:true'])
})

test('does not write flags onto <html>', () => {
  renderWith({ beta: 'enabled' })
  expect(html.hasAttribute('data-flag-beta')).toBe(false)
})

test('matches provider names case-insensitively', () => {
  renderWith({ Beta: 'enabled' })
  expect(renders).toEqual(['enabled:true'])
})

test('an attribute already on <html> overrides the provider', async () => {
  html.setAttribute('data-flag-beta', 'disabled')
  renderWith({ beta: 'enabled' })
  await update(() => {})
  expect(html.getAttribute('data-flag-beta')).toBe('disabled')
  expect(renders).toEqual(['disabled:false'])
})

test('after attach, outside changes update the hooks', async () => {
  renderWith({ beta: 'enabled' })
  await update(() => html.setAttribute('data-flag-beta', 'disabled'))
  expect(renders.at(-1)).toBe('disabled:false')
})

test('removing a provided flag falls back to the provider value', async () => {
  renderWith({ beta: 'enabled' })
  await update(() => html.removeAttribute('data-flag-beta'))
  expect(renders.at(-1)).toBe('enabled:true')
})

test('setting another value turns a provided flag off', async () => {
  renderWith({ beta: 'enabled' })
  await update(() => html.setAttribute('data-flag-beta', 'disabled'))
  expect(renders.at(-1)).toBe('disabled:false')
})

test('flags the provider does not supply still read <html> only', async () => {
  renders = []
  render(
    createElement(
      FeatureFlagsProvider,
      { flags: { other: 'on' } },
      createElement(Flags),
    ),
  )
  await update(() => html.setAttribute('data-flag-beta', 'enabled'))
  expect(renders.at(-1)).toBe('enabled:true')
  await update(() => html.removeAttribute('data-flag-beta'))
  expect(renders.at(-1)).toBe('unset:false')
})

test('ignores later changes to the flags prop', () => {
  const view = renderWith({ beta: 'enabled' })
  view.rerender(
    createElement(
      FeatureFlagsProvider,
      { flags: { beta: 'disabled', other: 'on' } },
      createElement(Flags),
    ),
  )
  expect(renders.at(-1)).toBe('enabled:true')
})

test('nested providers each keep their own values', async () => {
  renders = []
  render(
    createElement(
      FeatureFlagsProvider,
      { flags: { beta: 'enabled' } },
      createElement(Flags),
      createElement(
        FeatureFlagsProvider,
        { flags: { beta: 'disabled' } },
        createElement(Flags),
      ),
    ),
  )
  await update(() => {})
  expect(renders).toEqual(['enabled:true', 'disabled:false'])

  // An override on <html> applies to both
  await update(() => html.setAttribute('data-flag-beta', 'b'))
  expect(renders.slice(-2)).toEqual(['b:false', 'b:false'])
})

test('works under StrictMode', async () => {
  renders = []
  render(
    createElement(
      StrictMode,
      null,
      createElement(
        FeatureFlagsProvider,
        { flags: { beta: 'enabled' } },
        createElement(Flags),
      ),
    ),
  )
  expect(renders.at(-1)).toBe('enabled:true')
  await update(() => html.setAttribute('data-flag-beta', 'disabled'))
  expect(renders.at(-1)).toBe('disabled:false')
})

test('accepts flag names that are not valid attribute names', () => {
  renders = []
  render(
    createElement(
      FeatureFlagsProvider,
      { flags: { 'bad name': 'on', beta: 'enabled' } },
      createElement(Flags),
    ),
  )
  expect(renders).toEqual(['enabled:true'])
})

test('re-rendering the provider with a new flags object does not re-render consumers', () => {
  let count = 0
  // memo, so only the store or the context can re-render it
  const Consumer = memo(function Consumer() {
    count++
    return createElement('p', null, useFeatureFlag('beta') ?? 'unset')
  })
  // A new flags object every render, as with loader data or a spread
  const app = () =>
    createElement(
      FeatureFlagsProvider,
      { flags: { beta: 'enabled' } },
      createElement(Consumer),
    )

  const view = render(app())
  const initial = count
  view.rerender(app())
  view.rerender(app())
  expect(count).toBe(initial)
})
