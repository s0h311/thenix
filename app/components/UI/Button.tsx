import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Primary is the one action on a screen the athlete is meant to take, and is
 * the only place a brand fill is allowed to appear outside a "you are here"
 * marker. Destructive is outlined rather than filled so that it cannot be
 * mistaken for it.
 */
export type Tone = 'primary' | 'secondary' | 'ghost' | 'destructive'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-body font-semibold transition duration-100 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50'

const TONES: Record<Tone, string> = {
  primary: 'bg-brand text-on-brand hover:brightness-95 active:brightness-90',
  secondary: 'border border-hairline bg-raised text-ink hover:bg-sunken active:bg-sunken',
  ghost: 'text-ink-muted hover:bg-sunken hover:text-ink active:bg-sunken',
  destructive: 'border border-warning-line bg-raised text-warning hover:bg-warning-soft active:bg-warning-soft',
}

/**
 * The classes alone, for the anchors and `Link`s that have to look like a
 * button without being one.
 */
export function buttonClasses(tone: Tone, className = ''): string {
  return `${BASE} ${TONES[tone]} ${className}`
}

type Props = Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: Tone
    children: ReactNode
  }
>

export function Button({ tone = 'secondary', className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={buttonClasses(tone, className)}
      {...rest}
    />
  )
}
