# html-feature-flags

React hooks for feature flags. Set the base flags on a provider, override them with `data-flag-*` attributes on `<html>` from anything that can touch the DOM (an inline script, a tag manager, a test, devtools), and components using them re-render.

Requires React 19.

## Usage

```tsx
import { FeatureFlagsProvider } from 'html-feature-flags'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <FeatureFlagsProvider
          flags={{ beta: 'enabled', 'ab-test': 'b' }}
        >
          {children}
        </FeatureFlagsProvider>
      </body>
    </html>
  )
}
```

```tsx
import { useFeatureFlag, useFeatureFlagEnabled } from 'html-feature-flags'

function Example() {
  const beta = useFeatureFlagEnabled('beta') // true
  const variant = useFeatureFlag('ab-test') // 'b'
}
```

## Changing flags outside React

A `data-flag-*` attribute on `<html>` overrides the provider's value. Set one and the hooks update:

```js
document.documentElement.setAttribute('data-flag-beta', 'disabled')
```

- The provider doesn't write its flags to `<html>`. Only overrides live there.
- To turn a flag off, set another value such as `disabled`. Removing the attribute falls back to the provider's value.
- Without a provider, the hooks read `<html>` only.

## API

### `<FeatureFlagsProvider flags={...}>`

Supplies the base flags for server rendering, hydration and the client. `flags` is read once; later changes are ignored. Names are case-insensitive, so `{ abTest: 'b' }` is overridden by `data-flag-abtest`. Nested providers each keep their own values.

### `useFeatureFlag(name): string | undefined`

The value of `data-flag-<name>`, falling back to the provider's value, otherwise `undefined`. A valueless attribute returns `''`.

Names are case-insensitive and used as-is, with no camelCase conversion: `'ab-test'` reads `data-flag-ab-test`, and `'abTest'` reads `data-flag-abtest`.

### `useFeatureFlagEnabled(name): boolean`

`true` only when the value is `enabled`, ignoring case. Anything else, including an empty or missing value, is `false`.

## Server rendering

Under a provider, server rendering and hydration use the provider's values, so the server HTML is correct and hydrates without a mismatch. Without a provider, the hooks return `undefined` / `false` until hydration, then read `<html>`.

The package is marked `'use client'`, so a Server Component such as a Next.js root layout can render the provider directly.

If a script adds flag attributes to `<html>` before hydration and React renders `<html>`, React logs a development-only warning. Add `suppressHydrationWarning` to `<html>` to silence it.

## License

MIT
