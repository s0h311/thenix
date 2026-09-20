import { LOGO_SRC } from '../../libs/Brand/brand.ts'

type Props = Readonly<{
  className?: string
}>

export function Logo({ className = 'h-8 w-auto' }: Props) {
  return (
    <img
      src={LOGO_SRC}
      alt='thenix'
      width={528}
      height={256}
      className={className}
    />
  )
}
