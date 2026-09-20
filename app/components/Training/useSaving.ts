import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { sendSave } from '../../libs/Training/log.ts'
import { held, landed, nothingUnsaved, unsaved, unsavedAlert } from '../../libs/Training/saving.ts'
import type { Logged, Noted } from '../../libs/Training/logging.ts'

/**
 * Logging, and what becomes of a Log the server never gets. The tap is the save and
 * the screen moves on the instant it happens — so the one thing this must never do
 * is let a phone in a basement gym go on showing a set as recorded when it is not.
 * A Save that does not land is held and said out loud, and trying again is one tap.
 */
export function useSaving({ weekNumber, refresh }: { weekNumber: number; refresh: string }) {
  const queryClient = useQueryClient()
  const [outbox, setOutbox] = useState(nothingUnsaved)

  const { mutate } = useMutation({
    mutationFn: sendSave,
    onError: (_failure, save) => setOutbox((current) => held(current, save)),
    onSuccess: (_landed, save) => setOutbox((current) => landed(current, save)),
    // The Week is read back either way: a Save that failed leaves the screen showing
    // the tap, and what the server does hold is still what it says it holds.
    onSettled: () => queryClient.invalidateQueries({ queryKey: [refresh] }),
  })

  return {
    record: (entry: Logged) => mutate({ weekNumber, kind: 'log', entry }),
    note: (entry: Noted) => mutate({ weekNumber, kind: 'note', entry }),
    unsaved: unsavedAlert(outbox),
    /** Everything still held, sent again — one tap for a whole session's worth. */
    retry: () => unsaved(outbox).forEach((save) => mutate(save)),
  }
}
