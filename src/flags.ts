// Flag values and how to interpret them (`undefined` when unset). No React or
// DOM dependency.

/** Flag values keyed by name, e.g. `{ 'new-checkout': 'enabled' }`. */
export type FeatureFlags = Readonly<Record<string, string>>

/** The value as-is. */
export function rawValue(value: string | undefined): string | undefined {
  return value
}

/** `true` when the value is `"enabled"`, ignoring case. */
export function isEnabled(value: string | undefined): boolean {
  return value?.toLowerCase() === 'enabled'
}
