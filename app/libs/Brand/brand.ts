export const LOGO_SRC = '/thenix-logo-528x256.webp'
export const MARK_SRC = '/thenix-min.webp'
export const FAVICON_SRC = '/thenix-favicon-192x192.ico'

export const MANIFEST_SRC = '/manifest.webmanifest'

/** iOS ignores .ico, .webp and the manifest's icons for the home screen, and paints transparency black, so this is its own opaque PNG. */
export const APPLE_TOUCH_ICON_SRC = '/thenix-apple-touch-icon-180x180.png'

/** The page token `--color-page`, as hex for the browser's own chrome: stone-50 and stone-950. */
export const THEME_COLOR_LIGHT = '#fafaf9'
export const THEME_COLOR_DARK = '#0c0a09'

export const BRAND_HEAD_LINKS = [
  { rel: 'icon', type: 'image/x-icon', sizes: '192x192', href: FAVICON_SRC },
  { rel: 'apple-touch-icon', sizes: '180x180', href: APPLE_TOUCH_ICON_SRC },
  { rel: 'manifest', href: MANIFEST_SRC },
]

export const BRAND_HEAD_META = [
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  // `default`, not `black-translucent`: its white text would vanish against the
  // light page. iOS paints the bar behind `default` from the theme colour.
  { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
  { name: 'apple-mobile-web-app-title', content: 'thenix' },
]
