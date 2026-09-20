import type { HTMLAttributes, ReactNode } from 'react'

type Props = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode
  }
>

/** A raised surface: real elevation in light, a hairline in dark where a shadow says nothing. */
export function Card({ className = '', ...rest }: Props) {
  return (
    <div
      className={`rounded-xl border border-hairline bg-raised p-4 shadow-sm ${className}`}
      {...rest}
    />
  )
}
