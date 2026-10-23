import {
  createContext,
  createElement,
  useContext,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { read, seed } from './dom-store.js'

/** Flag values keyed by name, e.g. `{ 'new-checkout': 'enabled' }`. */
export type FeatureFlags = Readonly<Record<string, string>>

/** Where hooks under a provider get their values. */
export interface FlagSource {
  /** Server rendering and hydration: the provider's value. */
  server(name: string): string | undefined
  /** Client: the `<html>` attribute, falling back to the provider's value. */
  client(name: string): string | undefined
}

interface ProviderSource extends FlagSource {
  values: ReadonlyMap<string, string>
}

function createSource(flags: FeatureFlags): ProviderSource {
  // Lowercase to match the DOM, where attribute names are lowercase. A Map
  // also keeps names like `constructor` from hitting Object.prototype.
  const values = new Map(
    Object.entries(flags).map(([name, value]) => [name.toLowerCase(), value]),
  )
  const server = (name: string) => values.get(name.toLowerCase())

  return {
    values,
    server,
    // The attribute wins, so outside changes update every hook. Falling back
    // covers the first client-only render, before the provider has written
    // to <html>, so there's no re-render.
    client: (name) => read(name) ?? server(name),
  }
}

const Source = createContext<FlagSource | undefined>(undefined)

/**
 * Supplies feature flags. They're used for server rendering and hydration,
 * then written onto `<html>` as `data-flag-*` attributes when the provider
 * mounts. Attributes already on `<html>` are kept, and changes made outside
 * React update every hook. A removed attribute falls back to the provider's
 * value, so set a flag to another value (e.g. `disabled`) to turn it off.
 *
 * `flags` is read once, on mount. Later changes to the prop are ignored.
 */
export function FeatureFlagsProvider({
  flags,
  children,
}: {
  flags: FeatureFlags
  children?: ReactNode
}): ReactElement {
  // Created once, so the context value never changes and re-rendering the
  // provider doesn't re-render every component that reads a flag.
  const [source] = useState(() => createSource(flags))

  // Writes what the hooks already returned, so nothing re-renders.
  useLayoutEffect(() => seed(source.values), [source])

  return createElement(Source.Provider, { value: source }, children)
}

/** The nearest provider's source, or `undefined` without one. */
export function useFlagSource(): FlagSource | undefined {
  return useContext(Source)
}
