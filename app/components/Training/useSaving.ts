import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { sendSave } from '../../libs/Training/log.ts'
import { dismissed, held, landed, nothingUnsaved, unsaved, unsavedAlert } from '../../libs/Training/saving.ts'
import type { Logged, Noted } from '../../libs/Training/logging.ts'

/**
 * Logging, and what becomes of a Log the server never gets. The tap is the save and
 * the screen moves on the instant it happens — so the one thing this must never do
 * is let a phone in a basement gym go on showing a set as recorded when it is not.
 * A Save that does not land is held and said out loud, and trying again is one tap.
 * Why it did not land is held with it, because "check your connection" is no help to
 * an athlete whose session ended, and no help at all against a Save no retry can fix.
 */
export function useSaving({ weekNumber, refresh }: { weekNumber: number; refresh: string }) {
  const queryClient = useQueryClient()
  const [outbox, setOutbox] = useState(nothingUnsaved)

  const { mutate } = useMutation({
    mutationFn: sendSave,
    // One answer, four outcomes: `sendSave` does not throw, because what stopped a
    // Save is exactly what the athlete is told and what the bar's one button does.
    onSuccess: (landing, save) =>
      setOutbox((current) => (landing === 'landed' ? landed(current, save) : held(current, { save, why: landing }))),
    // The Week is read back either way: a Save that failed leaves the screen showing
    // the tap, and what the server does hold is still what it says it holds.
    onSettled: () => queryClient.invalidateQueries({ queryKey: [refresh] }),
  })

  return {
    record: (entry: Logged) => mutate({ weekNumber, kind: 'log', entry }),
    note: (entry: Noted) => mutate({ weekNumber, kind: 'note', entry }),
    unsaved: unsavedAlert(outbox),
    /** Everything still worth sending, sent again — one tap for a whole session's worth. */
    retry: () => unsaved(outbox).forEach((save) => mutate(save)),
    /** The Saves the server will not take, let go of: the only way the bar clears. */
    dismiss: () => setOutbox(dismissed),
  }
}
