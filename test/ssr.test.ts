// @vitest-environment node
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { prerender } from 'react-dom/static'
import { expect, test } from 'vitest'
import {
  FeatureFlagsProvider,
  useFeatureFlag,
  useFeatureFlagEnabled,
  type FeatureFlags,
} from '../src/index.js'

function Flags({ name = 'beta' }: { name?: string }) {
  const value = useFeatureFlag(name)
  const enabled = useFeatureFlagEnabled(name)
  return createElement('p', null, `${value ?? 'unset'}:${String(enabled)}`)
}

function render(flags?: FeatureFlags, name?: string): string {
  const app = createElement(Flags, { name })
  return renderToString(
    flags ? createElement(FeatureFlagsProvider, { flags }, app) : app,
  )
}

test('imports and renders on the server without a DOM', () => {
  expect(typeof document).toBe('undefined')
  expect(render()).toBe('<p>unset:false</p>')
})

test('reads values from FeatureFlagsProvider', () => {
  expect(render({ beta: 'enabled' })).toBe('<p>enabled:true</p>')
  expect(render({ beta: 'ENABLED' })).toBe('<p>ENABLED:true</p>')
  expect(render({ beta: 'on' })).toBe('<p>on:false</p>')
  expect(render({ other: 'enabled' })).toBe('<p>unset:false</p>')
})

test('matches provider names case-insensitively, like the DOM', () => {
  expect(render({ beta: 'enabled' }, 'Beta')).toBe('<p>enabled:true</p>')
  expect(render({ Beta: 'enabled' }, 'beta')).toBe('<p>enabled:true</p>')
  expect(render({ newCheckout: 'enabled' }, 'newCheckout')).toBe(
    '<p>enabled:true</p>',
  )
})

test('static rendering uses the provider values', async () => {
  const { prelude } = await prerender(
    createElement(
      FeatureFlagsProvider,
      { flags: { beta: 'enabled' } },
      createElement(Flags),
    ),
  )
  expect(await new Response(prelude).text()).toBe('<p>enabled:true</p>')
})

test('does not leak inherited object properties', () => {
  expect(render({}, 'constructor')).toBe('<p>unset:false</p>')
  expect(render({}, 'tostring')).toBe('<p>unset:false</p>')
  expect(render({}, '__proto__')).toBe('<p>unset:false</p>')
})
