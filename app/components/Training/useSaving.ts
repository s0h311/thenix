import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useState } from 'react'
import { sendSave } from '../../libs/Training/log.ts'
import { bottomBar, dismissed, held, landed, movedOn, nothingUnsaved, unsaved } from '../../libs/Training/saving.ts'
import { WEEK_READS } from '../../libs/Training/shelf.ts'
import type { Save } from '../../libs/Training/saving.ts'

const SAVE_KEY = ['save']

/**
 * Logging, and what becomes of a Log the server never gets. The tap is the save and
 * the screen moves on the instant it happens — so the one thing this must never do
 * is let a phone in a basement gym go on showing a set as recorded when it is not.
 * A Save that does not land is held and said out loud, and trying again is one tap.
 * Why it did not land is held with it, because "check your connection" is no help to
 * an athlete who was signed out, and no help at all against a Save no retry can fix.
 *
 * Call it once, above the routes. The outbox is the phone's and not any screen's, so it
 * has to outlive them all: the bar shows everywhere, and Unsaved Logs survive the trip
 * to `/sign-in` and back. It is held in memory only, so a reload still loses it.
 */
export function useSaving({ updateWaiting }: { updateWaiting: boolean }) {
  const queryClient = useQueryClient()
  const [outbox, setOutbox] = useState(nothingUnsaved)
  // On its way is not in the outbox yet, and a reload would drop it just the same.
  const sending = useIsMutating({ mutationKey: SAVE_KEY }) > 0

  const { mutate } = useMutation({
    mutationKey: SAVE_KEY,
    mutationFn: sendSave,
    // One answer, four outcomes: `sendSave` does not throw, because what stopped a
    // Save is exactly what the athlete is told and what the bar's one button does.
    onSuccess: (landing, save) => {
      setOutbox((current) => (landing === 'landed' ? landed(current, save) : held(current, { save, why: landing })))

      // Only once the server has spoken about the Save itself. A Save that never
      // reached it is not a reason to go asking again: that read fails too, and a
      // failed read is what replaces the Day the athlete is mid-set on.
      if (movedOn(landing)) {
        // All of them: a Save held since another Week was open lands from any screen.
        WEEK_READS.forEach((read) => void queryClient.invalidateQueries({ queryKey: [read] }))
      }
    },
  })

  return {
    save: (save: Save) => mutate(save),
    bar: bottomBar({ outbox, updateWaiting, sending }),
    /** Everything still worth sending, sent again — one tap for a whole session's worth. */
    retry: () => unsaved(outbox).forEach((save) => mutate(save)),
    /** The Saves the server will not take, let go of: the only way the bar clears. */
    dismiss: () => setOutbox(dismissed),
  }
}

/** How a screen hands over a Save. The answer to it is the bar's business, not the screen's. */
export const SaveContext = createContext<((save: Save) => void) | null>(null)

export function useSave(): (save: Save) => void {
  const save = useContext(SaveContext)

  if (save === null) {
    throw new Error('useSave needs SaveContext, which the root route provides')
  }

  return save
}
