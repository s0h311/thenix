import { useState } from 'react'

/**
 * Handing something to the coach, which is always the same act: one tap, nothing
 * shown of what was copied, and a word about whether it worked — silence would look
 * exactly like success and the athlete would paste whatever was there before.
 */
export function CopyButton({
  label,
  copied,
  failed,
  onCopy,
}: {
  label: string
  copied: string
  failed: string
  onCopy: () => Promise<void>
}) {
  const [handed, setHanded] = useState<'untouched' | 'copying' | 'copied' | 'failed'>('untouched')

  async function hand() {
    setHanded('copying')

    try {
      await onCopy()
      setHanded('copied')
    } catch {
      setHanded('failed')
    }
  }

  return (
    <section className='space-y-2'>
      <button
        type='button'
        onClick={hand}
        disabled={handed === 'copying'}
        className='w-full rounded-md border border-legacy px-3 py-2 font-semibold text-legacy disabled:opacity-60'
      >
        {label}
      </button>
      {handed === 'untouched' || handed === 'copying' ? null : (
        <p
          aria-live='polite'
          className='text-sm font-semibold'
        >
          {handed === 'copied' ? copied : failed}
        </p>
      )}
    </section>
  )
}
