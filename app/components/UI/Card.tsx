import type { HTMLAttributes, ReactNode } from 'react'

const BASE = 'rounded-xl border border-hairline bg-raised p-4 shadow-sm'

/**
 * The classes alone, for the buttons and links that have to be a card without
 * being a div — a Week on the Shelf is one tap target, card and all.
 */
export function cardClasses(className = ''): string {
  return `${BASE} ${className}`
}

type Props = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode
  }
>

/** A raised surface: real elevation in light, a hairline in dark where a shadow says nothing. */
export function Card({ className = '', ...rest }: Props) {
  return (
    <div
      className={cardClasses(className)}
      {...rest}
    />
  )
}
