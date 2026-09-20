import type { ImportFault } from '../../../shared/training.ts'

/** Just enough of the clipboard to hand the list over. */
type Clipboard = { writeText: (text: string) => Promise<void> }

/**
 * The faults as the coach reads them. The fix loop runs through the same chat the
 * plan came from, so this is written to be pasted back whole: a heading saying what
 * to do with it, then one line per fault naming the Day, the Exercise and the field.
 */
export function faultsForCoach(faults: ImportFault[]): string {
  const lines = faults.map((fault) => `- ${nameOf(fault)}: ${fault.message}`)

  return ['The Week you wrote did not import. Please fix these and send it again:', '', ...lines].join('\n')
}

/**
 * The whole list on the clipboard in one action — the athlete is not going to
 * retype a fault, and half a list pasted back gets half a Week fixed.
 */
export async function copyFaults({
  faults,
  to = navigator.clipboard,
}: {
  faults: ImportFault[]
  to?: Clipboard
}): Promise<void> {
  await to.writeText(faultsForCoach(faults))
}

/** Where the fault sits, shown the same way on screen as on the clipboard. */
export function nameOf(fault: ImportFault): string {
  return [fault.day === null ? 'week' : `day ${fault.day}`, fault.exercise, fault.field].filter(Boolean).join(' · ')
}
