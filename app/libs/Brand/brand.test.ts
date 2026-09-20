import { access } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { APPLE_TOUCH_ICON_SRC, BRAND_HEAD_LINKS, FAVICON_SRC, LOGO_SRC, MARK_SRC } from './brand.ts'

describe('brand assets', () => {
  test.each([LOGO_SRC, MARK_SRC, FAVICON_SRC, APPLE_TOUCH_ICON_SRC])('%s is served from public/', async (src) => {
    await expect(access(`public${src}`)).resolves.toBeUndefined()
  })

  test('the head declares a favicon for the browser tab', () => {
    expect(BRAND_HEAD_LINKS).toContainEqual(expect.objectContaining({ rel: 'icon', href: FAVICON_SRC }))
  })

  test('the head declares a home-screen icon in a format iOS accepts', () => {
    const homeScreenIcon = BRAND_HEAD_LINKS.find((link) => link.rel === 'apple-touch-icon')

    expect(homeScreenIcon?.href).toMatch(/\.png$/)
  })
})
