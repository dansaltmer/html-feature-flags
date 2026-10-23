import { useSyncExternalStore } from 'react'
import { isEnabled, read, subscribe } from './dom-store.js'
import { useFlagSource } from './provider.js'

function useFlag<T>(name: string, select: (value: string | undefined) => T): T {
  const source = useFlagSource()
  return useSyncExternalStore(
    subscribe,
    () => select(source ? source.client(name) : read(name)),
    () => select(source?.server(name)),
  )
}

const identity = (value: string | undefined) => value

/**
 * Value of the `data-flag-<name>` attribute on `<html>`, or `undefined` when
 * it is absent. `useFeatureFlag('search-typos')` reads `data-flag-search-typos`.
 * A valueless attribute returns `''`.
 *
 * During server rendering and hydration, reads from `FeatureFlagsProvider`.
 */
export function useFeatureFlag(name: string): string | undefined {
  return useFlag(name, identity)
}

/**
 * `true` when the flag value is `"enabled"`, ignoring case. Any other value,
 * or no attribute, is `false`.
 *
 * During server rendering and hydration, reads from `FeatureFlagsProvider`.
 */
export function useFeatureFlagEnabled(name: string): boolean {
  return useFlag(name, isEnabled)
}
