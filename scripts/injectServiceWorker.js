const PUBLIC_OUTPUT_DIR = '.output/public'

export async function injectServiceWorker() {
  // Imported here because vite.config.ts loads this file on every dev start too, and only a build needs it.
  const { injectManifest } = await import('workbox-build')

  const { count, size, warnings } = await injectManifest({
    swSrc: 'public/sw.js',
    swDest: `${PUBLIC_OUTPUT_DIR}/sw.js`,
    globDirectory: PUBLIC_OUTPUT_DIR,
    globPatterns: ['assets/**/*', '*.{png,ico,webp}', 'no-signal.html'],
    dontCacheBustURLsMatching: /^assets\//,
  })

  // A file skipped from the precache would only surface with no signal, so stop the build here.
  if (warnings.length > 0) {
    throw new Error(`Service worker precache: ${warnings.join(', ')}`)
  }

  console.log(`Service worker precaches ${count} files, ${size} bytes`)
}
