import { CopyButton } from './CopyButton.tsx'
import { copyFaults, nameOf } from '../../libs/Training/faults.ts'
import { Card } from '../UI/Card.tsx'
import { Layer } from '../UI/Layer.tsx'
import type { ImportFault } from '../../../shared/training.ts'

/**
 * Why nothing was imported, in a form that goes straight back to the coach. The
 * coach wrote the JSON, so the coach fixes it: the athlete's whole job here is one
 * tap to copy and one paste into the chat the Week came from.
 *
 * It takes the viewport like the Preview does, and for the same reason — a rejected
 * paste is read, not glanced at — and it says the Shelf is untouched, because the
 * first thing a refusal looks like is damage.
 */
export function Faults({ faults, onBack }: { faults: ImportFault[]; onBack: () => void }) {
  return (
    <Layer
      heading='Nothing was imported'
      dismiss='Paste the corrected Week'
      onDismiss={onBack}
      footer={
        <CopyButton
          label='Copy the whole list'
          copied='Copied — paste it to your coach.'
          failed='The list could not be copied. Try again.'
          onCopy={() => copyFaults(faults)}
        />
      }
    >
      <p className='text-ink-muted'>
        Your Shelf is untouched. Send these back to your coach and ask for a corrected Week.
      </p>

      <Card>
        <ul className='space-y-2'>
          {faults.map((fault) => (
            <li
              key={`${fault.day}-${fault.exercise}-${fault.field}-${fault.message}`}
              className='space-y-0.5'
            >
              {/* The place first, in the coach's own coordinates, then what is wrong with it. */}
              <p className='font-mono text-caption text-ink-muted'>{nameOf(fault)}</p>
              <p className='text-label'>{fault.message}</p>
            </li>
          ))}
        </ul>
      </Card>
    </Layer>
  )
}
