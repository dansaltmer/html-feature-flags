import { act } from '@testing-library/react'
import {
  createElement,
  lazy,
  Suspense,
  type ComponentType,
  type ReactElement,
} from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test } from 'vitest'
import {
  FeatureFlagsProvider,
  useFeatureFlag,
  useFeatureFlagEnabled,
} from './index.js'

const html = document.documentElement
let root: Root | undefined
let renders: string[] = []

function Flags() {
  const text = `${useFeatureFlag('beta') ?? 'unset'}:${String(useFeatureFlagEnabled('beta'))}`
  renders.push(text)
  return createElement('p', null, text)
}

const withProvider = (child: ReactElement) =>
  createElement(FeatureFlagsProvider, { flags: { beta: 'enabled' } }, child)

/**
 * Server-renders `server`, then hydrates `client` (the same tree by default)
 * over that HTML in jsdom. Returns hydration errors.
 */
async function hydrate(
  server: ReactElement,
  client: ReactElement = server,
): Promise<unknown[]> {
  const container = document.createElement('div')
  container.innerHTML = renderToString(server)
  document.body.append(container)
  renders = []

  const errors: unknown[] = []
  await act(async () => {
    root = hydrateRoot(container, client, {
      onRecoverableError: (error) => errors.push(error),
    })
    await Promise.resolve()
  })
  return errors
}

/** Changes attributes on <html> and lets the MutationObserver deliver. */
async function update(change: () => void): Promise<void> {
  await act(async () => {
    change()
    await Promise.resolve()
  })
}

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  for (const { name } of [...html.attributes]) html.removeAttribute(name)
})

test('hydrates to the provider values in one render, then writes them to <html>', async () => {
  const errors = await hydrate(withProvider(createElement(Flags)))
  await update(() => {})
  expect(errors).toEqual([])
  expect(renders).toEqual(['enabled:true'])
  expect(html.getAttribute('data-flag-beta')).toBe('enabled')
})

test('without a provider, hydrates unset then updates from the DOM', async () => {
  html.setAttribute('data-flag-beta', 'enabled')
  const errors = await hydrate(createElement(Flags))
  expect(errors).toEqual([])
  expect(renders).toEqual(['unset:false', 'enabled:true'])
})

test('a value set before hydration hydrates cleanly, then wins', async () => {
  // An inline script or tag manager got there first
  html.setAttribute('data-flag-beta', 'disabled')
  const errors = await hydrate(withProvider(createElement(Flags)))
  expect(errors).toEqual([])
  expect(renders).toEqual(['enabled:true', 'disabled:false'])
  expect(html.getAttribute('data-flag-beta')).toBe('disabled')
})

test('after hydration, outside changes update the hooks', async () => {
  await hydrate(withProvider(createElement(Flags)))
  await update(() => html.setAttribute('data-flag-beta', 'disabled'))
  expect(renders.at(-1)).toBe('disabled:false')
  // A removal falls back to the provider value
  await update(() => html.removeAttribute('data-flag-beta'))
  expect(renders.at(-1)).toBe('enabled:true')
})

test('a Suspense boundary hydrating later still matches the server HTML', async () => {
  let resolve!: (module: { default: ComponentType }) => void
  const LazyFlags = lazy(
    () => new Promise<{ default: ComponentType }>((r) => (resolve = r)),
  )
  // The server renders Flags directly; the client has to wait for the lazy
  // component, so this boundary hydrates after the provider has attached.
  const errors = await hydrate(
    withProvider(
      createElement(Suspense, { fallback: null }, createElement(Flags)),
    ),
    withProvider(
      createElement(Suspense, { fallback: null }, createElement(LazyFlags)),
    ),
  )
  expect(renders).toEqual([])
  expect(html.getAttribute('data-flag-beta')).toBe('enabled')

  // Changed before the boundary hydrates
  html.setAttribute('data-flag-beta', 'disabled')
  await act(async () => {
    resolve({ default: Flags })
    await Promise.resolve()
  })

  expect(errors).toEqual([])
  expect(renders).toEqual(['enabled:true', 'disabled:false'])
})
