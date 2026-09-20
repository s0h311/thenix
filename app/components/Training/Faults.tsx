import { CopyButton } from './CopyButton.tsx'
import { copyFaults, nameOf } from '../../libs/Training/faults.ts'
import type { ImportFault } from '../../../shared/training.ts'

/**
 * Why nothing was imported, in a form that goes straight back to the coach. The
 * coach wrote the JSON, so the coach fixes it: the athlete's whole job here is one
 * tap to copy and one paste into the chat the Week came from.
 */
export function Faults({
  faults,
  to,
  onBack,
}: {
  faults: ImportFault[]
  /** The clipboard the list is handed to. The browser's own, unless a test says otherwise. */
  to?: { writeText: (text: string) => Promise<void> }
  onBack: () => void
}) {
  return (
    <section className='space-y-3'>
      <h2 className='text-xl font-semibold'>Nothing was imported</h2>
      <p>Your Week is untouched. Send these back to your coach and ask for a corrected Week.</p>
      <ul className='space-y-1 font-mono text-sm'>
        {faults.map((fault) => (
          <li key={`${fault.day}-${fault.exercise}-${fault.field}-${fault.message}`}>
            {`${nameOf(fault)}: ${fault.message}`}
          </li>
        ))}
      </ul>
      <CopyButton
        label='Copy the whole list'
        copied='Copied — paste it to your coach.'
        failed='The list could not be copied. Try again.'
        onCopy={() => copyFaults({ faults, to })}
      />
      <button
        type='button'
        onClick={onBack}
        className='w-full rounded-md border border-brand px-3 py-2 font-semibold text-brand'
      >
        Paste the corrected Week
      </button>
    </section>
  )
}
