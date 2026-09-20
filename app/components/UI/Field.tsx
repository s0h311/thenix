import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

/**
 * A field looks like a field: a sunken well and a hairline, never a block of
 * brand. The classes are exported for the native controls — the Preview's date
 * picker — that cannot be wrapped.
 */
export const FIELD_CLASSES =
  'w-full rounded-lg border border-hairline bg-sunken px-3 py-2.5 text-body text-ink placeholder:text-ink-faint transition duration-100 ease-out hover:border-ink-faint focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand disabled:opacity-50'

type Labelled = Readonly<{
  label: string
  /** Shown under the control, for what the athlete needs after reading the label. */
  hint?: ReactNode
}>

function Wrapper({ label, hint, id, children }: Readonly<{ id: string; children: ReactNode } & Labelled>) {
  const hintId = `${id}-hint`

  return (
    <div className='space-y-1.5 text-left'>
      <label
        htmlFor={id}
        className='block text-label font-semibold text-ink'
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p
          id={hintId}
          className='text-caption text-ink-muted'
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({
  label,
  hint,
  className = '',
  ...rest
}: Readonly<InputHTMLAttributes<HTMLInputElement>> & Labelled) {
  const id = useId()

  return (
    <Wrapper
      id={id}
      label={label}
      hint={hint}
    >
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${FIELD_CLASSES} ${className}`}
        {...rest}
      />
    </Wrapper>
  )
}

export function TextArea({
  label,
  hint,
  className = '',
  ...rest
}: Readonly<TextareaHTMLAttributes<HTMLTextAreaElement>> & Labelled) {
  const id = useId()

  return (
    <Wrapper
      id={id}
      label={label}
      hint={hint}
    >
      <textarea
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${FIELD_CLASSES} ${className}`}
        {...rest}
      />
    </Wrapper>
  )
}
