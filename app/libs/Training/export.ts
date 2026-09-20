/**
 * The whole of exporting: ask the server for the Week with its Logs, and put it on
 * the clipboard. Handing it to the coach is then a paste, which is the point — the
 * athlete never sees the JSON, downloads a file, or picks where it goes.
 */
export async function copyWeek({ number }: { number: number }): Promise<void> {
  await handOver({ url: `/api/actions/exportWeek?number=${number}`, what: 'the Week' })
}

/**
 * The contract itself, for a fresh chat with the coach: a coach that has not read
 * the schema writes JSON the import rejects, so this is what keeps it conformant.
 */
export async function copySchema(): Promise<void> {
  await handOver({ url: '/api/actions/exportSchema', what: 'the schema' })
}

/** And the ids already in use, so the coach reuses a Movement rather than renaming it. */
export async function copyRegistry(): Promise<void> {
  await handOver({ url: '/api/actions/exportRegistry', what: 'the Movement list' })
}

async function handOver({ url, what }: { url: string; what: string }): Promise<void> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`${what} could not be exported`)
  }

  // Read in full before the clipboard is touched: a half-copied Week pasted to the
  // coach is worse than nothing having happened.
  await navigator.clipboard.writeText(await response.text())
}
