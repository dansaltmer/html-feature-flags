import { useContext, useSyncExternalStore } from 'react'
import { FlagsContext } from './context.js'
import { read, subscribe } from './dom-store.js'
import { isEnabled, rawValue } from './flags.js'

function useFlag<T>(name: string, select: (value: string | undefined) => T): T {
  // Provider keys are lowercased, matching HTML attribute names
  const base = useContext(FlagsContext)?.get(name.toLowerCase())
  return useSyncExternalStore(
    subscribe,
    () => select(read(name) ?? base), // <html> overrides the provider
    () => select(base),
  )
}

/**
 * Value of the `data-flag-<name>` attribute on `<html>`, or `undefined` when
 * it is absent. `useFeatureFlag('search-typos')` reads `data-flag-search-typos`.
 * A valueless attribute returns `''`.
 *
 * During server rendering and hydration, reads from `FeatureFlagsProvider`.
 */
export function useFeatureFlag(name: string): string | undefined {
  return useFlag(name, rawValue)
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
