/** Just enough of `fetch` and of the clipboard to hand a Week over. */
type Source = (url: string) => Promise<{ ok: boolean; text: () => Promise<string> }>
type Clipboard = { writeText: (text: string) => Promise<void> }

/**
 * The whole of exporting: ask the server for the Week with its Logs, and put it on
 * the clipboard. Handing it to the coach is then a paste, which is the point — the
 * athlete never sees the JSON, downloads a file, or picks where it goes.
 */
export async function copyWeek({
  number,
  from = fetch,
  to = navigator.clipboard,
}: {
  number: number
  from?: Source
  to?: Clipboard
}): Promise<void> {
  const response = await from(`/api/actions/exportWeek?number=${number}`)

  if (!response.ok) {
    throw new Error('the Week could not be exported')
  }

  // Read in full before the clipboard is touched: a half-copied Week pasted to the
  // coach is worse than nothing having happened.
  await to.writeText(await response.text())
}
