/** Just enough of `fetch` and of the clipboard to hand something over. */
type Source = (url: string) => Promise<{ ok: boolean; text: () => Promise<string> }>
type Clipboard = { writeText: (text: string) => Promise<void> }

type Desk = { from?: Source; to?: Clipboard }

/**
 * The whole of exporting: ask the server for the Week with its Logs, and put it on
 * the clipboard. Handing it to the coach is then a paste, which is the point — the
 * athlete never sees the JSON, downloads a file, or picks where it goes.
 */
export async function copyWeek({ number, from, to }: { number: number } & Desk): Promise<void> {
  await handOver({ url: `/api/actions/exportWeek?number=${number}`, what: 'the Week', from, to })
}

/**
 * The contract itself, for a fresh chat with the coach: a coach that has not read
 * the schema writes JSON the import rejects, so this is what keeps it conformant.
 */
export async function copySchema({ from, to }: Desk = {}): Promise<void> {
  await handOver({ url: '/api/actions/exportSchema', what: 'the schema', from, to })
}

/** And the ids already in use, so the coach reuses a Movement rather than renaming it. */
export async function copyRegistry({ from, to }: Desk = {}): Promise<void> {
  await handOver({ url: '/api/actions/exportRegistry', what: 'the Movement list', from, to })
}

async function handOver({
  url,
  what,
  from = fetch,
  to = navigator.clipboard,
}: { url: string; what: string } & Desk): Promise<void> {
  const response = await from(url)

  if (!response.ok) {
    throw new Error(`${what} could not be exported`)
  }

  // Read in full before the clipboard is touched: a half-copied Week pasted to the
  // coach is worse than nothing having happened.
  await to.writeText(await response.text())
}
