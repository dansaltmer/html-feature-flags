import {
  createElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { FlagsContext } from './context.js'
import type { FeatureFlags } from './flags.js'

/**
 * Supplies the base feature flags, used for server rendering, hydration and
 * on the client. A `data-flag-*` attribute on `<html>` overrides the
 * provider's value, and changes made outside React update every hook.
 * Removing the attribute falls back to the provider's value, so set a flag to
 * another value (e.g. `disabled`) to turn it off.
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
  // provider doesn't re-render every component that reads a flag. Names are
  // lowercased to match the DOM, where attribute names are lowercase. A Map
  // also keeps names like `constructor` from hitting Object.prototype.
  const [values] = useState(
    () =>
      new Map(
        Object.entries(flags).map(([name, value]) => [
          name.toLowerCase(),
          value,
        ]),
      ),
  )

  return createElement(FlagsContext.Provider, { value: values }, children)
}
