import { defineConfig } from 'vitest/config'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    // Ship readable code; consuming apps minify.
    minify: false,
    sourcemap: true,
    rolldownOptions: {
      // react plus subpaths such as react/jsx-runtime
      external: [/^react($|\/)/],
      output: {
        // Everything here runs on the client (hooks, context, DOM). Marking
        // the bundle lets React Server Components import the provider and
        // pass it serialisable flags.
        banner: "'use client';",
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
