import { createContext } from 'react'

/**
 * The nearest provider's flags, keyed by lowercase name, or `undefined`
 * without one. Internal: not exported from the package.
 */
export const FlagsContext = createContext<
  ReadonlyMap<string, string> | undefined
>(undefined)
