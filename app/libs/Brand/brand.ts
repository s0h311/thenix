export const LOGO_SRC = '/thenix-logo-528x256.webp'
export const MARK_SRC = '/thenix-min.webp'
export const FAVICON_SRC = '/thenix-favicon-192x192.ico'

/** iOS ignores .ico and .webp for home-screen icons, so the favicon's PNG payload is served separately. */
export const APPLE_TOUCH_ICON_SRC = '/thenix-apple-touch-icon-192x192.png'

export const BRAND_HEAD_LINKS = [
  { rel: 'icon', type: 'image/x-icon', sizes: '192x192', href: FAVICON_SRC },
  { rel: 'apple-touch-icon', sizes: '192x192', href: APPLE_TOUCH_ICON_SRC },
]
