// Flag values live as data-flag-* attributes on <html>. This module has no
// React dependency: it reads and seeds attributes and notifies subscribers of
// changes.

const PREFIX = 'data-flag-'

// Names are used as-is. HTML attribute names are case-insensitive, so
// `Beta` and `beta` both read `data-flag-beta`.
export function read(name: string): string | undefined {
  return document.documentElement.getAttribute(PREFIX + name) ?? undefined
}

export function isEnabled(value: string | undefined): boolean {
  return value?.toLowerCase() === 'enabled'
}

/**
 * Writes each flag onto `<html>` unless an attribute for it is already there.
 * Anything set earlier (an inline script, a tag manager) wins.
 */
export function seed(flags: ReadonlyMap<string, string>): void {
  const html = document.documentElement
  for (const [name, value] of flags) {
    if (html.hasAttribute(PREFIX + name)) continue
    try {
      html.setAttribute(PREFIX + name, value)
    } catch {
      // Not a valid attribute name (e.g. contains a space). Skip it rather
      // than break the app over one bad flag.
      console.warn(`html-feature-flags: skipped invalid flag name "${name}"`)
    }
  }
}

// One observer shared by every subscriber, connected only while in use.
const listeners = new Set<() => void>()
let observer: MutationObserver | undefined

function notify(records: MutationRecord[]): void {
  // Ignore unrelated <html> attribute changes (theme, lang, classes, ...)
  if (records.some((record) => record.attributeName?.startsWith(PREFIX))) {
    listeners.forEach((listener) => listener())
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    observer ??= new MutationObserver(notify)
    observer.observe(document.documentElement, { attributes: true })
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) observer?.disconnect()
  }
}
