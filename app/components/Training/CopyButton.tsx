import { useState } from 'react'
import { Button } from '../UI/Button.tsx'

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
      <Button
        onClick={hand}
        disabled={handed === 'copying'}
        className='w-full'
      >
        {label}
      </Button>
      {handed === 'untouched' || handed === 'copying' ? null : (
        <p
          aria-live='polite'
          className={`text-label font-semibold ${handed === 'copied' ? 'text-ink-muted' : 'text-warning'}`}
        >
          {handed === 'copied' ? copied : failed}
        </p>
      )}
    </section>
  )
}
