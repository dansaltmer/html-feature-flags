// Flag overrides live as data-flag-* attributes on <html>. This module has no
// React dependency: it reads attributes and notifies subscribers of changes.

const PREFIX = 'data-flag-'

// Names are used as-is. HTML attribute names are case-insensitive, so
// `Beta` and `beta` both read `data-flag-beta`.
export function read(name: string): string | undefined {
  return document.documentElement.getAttribute(PREFIX + name) ?? undefined
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
