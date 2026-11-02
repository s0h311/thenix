# A hand-written service worker with a workbox injectManifest step

The service worker is a plain file, `public/sw.js`. The only generated part is its precache list,
which workbox-build's `injectManifest` writes into the copy in `.output/public`.

vite-plugin-pwa and Serwist would be the obvious choice, and someone will want to "simplify" back
to one. Neither supports TanStack Start + Nitro production builds: Nitro's shared multi-environment
build regenerates the worker in every environment. See TanStack/router#4988, vite-pwa#940 and
serwist#300.

## The injection runs inside the build, not after it

A script chained after `vite build` looks like the natural place, and it breaks updates. Nitro's
static handler answers from a table of each public file's size and ETag, read when the server is
bundled. Rewriting `sw.js` after that leaves the table describing the placeholder version:

- `Content-Length` is too short for the injected file, so the worker is cut off.
- The ETag stays the same from deploy to deploy unless the worker's source changes, so a browser
  checking for a new version gets a 304 and never sees it.

So a Vite plugin in `vite.config.ts` runs the step at the start of the `nitro` environment's build.
That is after Nitro has copied the client output and public files to `.output/public`, and before it
reads them. `pnpm build` and the Dockerfile's build path both get it through `vite build`. The hook
depends on that ordering in Nitro, so check it when upgrading Nitro: the built `/sw.js` must contain
the precache list and its `Content-Length` must match its real size.

## Consequences

Only page loads and precached files are handled. Pages are never stored, and API requests pass
through untouched, so a signal always means fresh data. Hashed assets, icons and the no-signal page
are served from the precache.

`/sw.js` is served with `cache-control: no-cache` so browsers revalidate it. The reverse proxy must
not override that.

## When to revisit

Move to unplugin-pwa once it ships with a Nitro integration.
