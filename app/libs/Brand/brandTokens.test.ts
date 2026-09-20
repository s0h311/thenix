import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { compile } from 'tailwindcss'
import colors from 'tailwindcss/colors'
import { describe, expect, test } from 'vitest'

const TAILWIND_ENTRY = 'node_modules/tailwindcss/index.css'
const APP_CSS = 'app/index.css'

async function loadStylesheet(id: string, base: string) {
  const path = id === 'tailwindcss' ? TAILWIND_ENTRY : resolve(base, id)
  return { path, base: dirname(path), content: await readFile(path, 'utf8') }
}

/** The app's stylesheet, compiled the way Tailwind compiles it, with `utilities` in play. */
async function buildAppCss(utilities: string[]): Promise<string> {
  const compiler = await compile(await readFile(APP_CSS, 'utf8'), { base: 'app', loadStylesheet })
  return compiler.build(utilities)
}

/** Follows `var(--x)` indirection until a literal colour falls out. */
function resolveCustomProperty(css: string, name: string): string {
  const declared = new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()

  if (declared === undefined) {
    throw new Error(`${name} is not declared in the compiled stylesheet`)
  }

  const reference = /^var\((--[\w-]+)\)$/.exec(declared)?.[1]

  return reference === undefined ? declared : resolveCustomProperty(css, reference)
}

/** WCAG relative luminance of an `oklch()` colour, via OKLab and linear sRGB. */
function relativeLuminance(color: string): number {
  const [, lightness, chroma, hue] = /oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/.exec(color) ?? []

  if (lightness === undefined || chroma === undefined || hue === undefined) {
    throw new Error(`${color} is not an oklch() colour`)
  }

  const lightnessValue = Number(lightness) / 100
  const a = Number(chroma) * Math.cos((Number(hue) * Math.PI) / 180)
  const b = Number(chroma) * Math.sin((Number(hue) * Math.PI) / 180)

  const long = (lightnessValue + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3
  const medium = (lightnessValue - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3
  const short = (lightnessValue - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3

  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  const red = clamp(4.076_741_662_1 * long - 3.307_711_591_3 * medium + 0.230_969_929_2 * short)
  const green = clamp(-1.268_438_004_6 * long + 2.609_757_401_1 * medium - 0.341_319_396_5 * short)
  const blue = clamp(-0.004_196_086_3 * long - 0.703_418_614_7 * medium + 1.707_614_701 * short)

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(color: string, against: string): number {
  const [darker, lighter] = [relativeLuminance(color), relativeLuminance(against)].toSorted((a, b) => a - b)

  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)
}

describe('brand tokens', () => {
  test('brand text colour is the amber-900 of the Tailwind scale', async () => {
    const css = await buildAppCss(['text-brand'])

    expect(resolveCustomProperty(css, '--color-brand')).toBe(colors.amber[900])
  })

  test('brand surface colour is the amber-200 of the Tailwind scale', async () => {
    const css = await buildAppCss(['bg-brand-surface'])

    expect(resolveCustomProperty(css, '--color-brand-surface')).toBe(colors.amber[200])
  })

  test('brand tokens are declared from the amber scale, never as colour literals', async () => {
    const theme = /@theme\s*\{([^}]*)\}/.exec(await readFile(APP_CSS, 'utf8'))?.[1] ?? ''

    expect(theme).toMatch(/--color-brand:/)
    expect(theme).not.toMatch(/#[\da-f]{3,8}|oklch\(|rgb\(|hsl\(/i)
  })
})

describe('brand contrast', () => {
  const WCAG_AA_NORMAL_TEXT = 4.5
  const WHITE = 'oklch(100% 0 0)'

  test('the contrast formula matches the known black-on-white ratio', () => {
    expect(contrastRatio(WHITE, 'oklch(0% 0 0)')).toBeCloseTo(21, 2)
  })

  test('brand text on a brand surface meets WCAG AA', async () => {
    const css = await buildAppCss(['text-brand', 'bg-brand-surface'])

    const ratio = contrastRatio(
      resolveCustomProperty(css, '--color-brand'),
      resolveCustomProperty(css, '--color-brand-surface'),
    )

    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT)
  })

  test('brand text on a white page meets WCAG AA', async () => {
    const css = await buildAppCss(['text-brand'])

    expect(contrastRatio(resolveCustomProperty(css, '--color-brand'), WHITE)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    )
  })

  test('white text on a brand primary action meets WCAG AA', async () => {
    const css = await buildAppCss(['bg-brand'])

    expect(contrastRatio(WHITE, resolveCustomProperty(css, '--color-brand'))).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    )
  })
})
