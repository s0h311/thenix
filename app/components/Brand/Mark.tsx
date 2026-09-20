import { MARK_SRC } from '../../libs/Brand/brand.ts'

type Props = Readonly<{
  className?: string
}>

/** The compact mark, for badges where the full logo does not fit. */
export function Mark({ className = 'size-8' }: Props) {
  return (
    <img
      src={MARK_SRC}
      alt=''
      width={512}
      height={512}
      className={`rounded-md ${className}`}
    />
  )
}
