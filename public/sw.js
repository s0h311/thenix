// Hand-written on purpose, see docs/adr/0006-hand-written-service-worker.md.
// The build replaces the placeholder below with the precache list. This file is
// never registered unbuilt: registration happens in production builds only.

const PRECACHE_ENTRIES = self.__WB_MANIFEST
const NO_SIGNAL_URL = new URL('/no-signal.html', self.location.origin).href
const CACHE_PREFIX = 'thenix-precache-'

const PRECACHE_URLS = new Set(PRECACHE_ENTRIES.map((entry) => new URL(entry.url, self.location.origin).href))
const CACHE_NAME = CACHE_PREFIX + hash(JSON.stringify(PRECACHE_ENTRIES))

// A new build gets a new cache, so an old worker keeps its own files until it is replaced.
function hash(text) {
  let value = 0

  for (let i = 0; i < text.length; i++) {
    value = (Math.imul(value, 31) + text.charCodeAt(i)) | 0
  }

  return (value >>> 0).toString(36)
}

// No skipWaiting here: a new worker waits until the athlete chooses to reload.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // `no-cache` so an unhashed file can't be taken stale from the HTTP cache.
      cache.addAll([...PRECACHE_URLS].map((url) => new Request(url, { cache: 'no-cache' }))),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  // Pages always come from the network and are never stored, so a signal means fresh data.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(noSignalPage))
    return
  }

  // Everything else that isn't precached, the API above all, is left to the browser.
  if (PRECACHE_URLS.has(request.url)) {
    event.respondWith(precached(request))
  }
})

async function noSignalPage() {
  const cache = await caches.open(CACHE_NAME)

  return (await cache.match(NO_SIGNAL_URL)) ?? Response.error()
}

async function precached(request) {
  const cache = await caches.open(CACHE_NAME)

  return (await cache.match(request)) ?? fetch(request)
}
