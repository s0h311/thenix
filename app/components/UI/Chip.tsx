import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Chosen, or where the athlete is. Carried as `aria-pressed` as well as in colour. */
    selected?: boolean
    children: ReactNode
  }
>

/**
 * Selection is marked by weight as well as by fill, so that a chosen chip
 * survives being read without colour.
 */
export function Chip({ selected = false, className = '', type = 'button', ...rest }: Props) {
  const state = selected
    ? 'border-transparent bg-brand text-on-brand font-semibold'
    : 'border-hairline bg-raised text-ink-muted hover:bg-sunken hover:text-ink'

  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-label transition duration-100 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.97] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 ${state} ${className}`}
      {...rest}
    />
  )
}
