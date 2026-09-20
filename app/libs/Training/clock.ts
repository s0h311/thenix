/**
 * The date the athlete is on. Every call that asks the server what is due — opening
 * today's training, the shelf, a Log, the date a pasted Week is offered — sends this
 * one, and there is deliberately nowhere else to get it: the app ran two definitions
 * of today, and UTC is the wrong one. It is a day ahead of a Monday evening in Los
 * Angeles and a day behind a small hour in Berlin, and the Week is dated from it.
 */
export function today(): string {
  const now = new Date()

  return [now.getFullYear(), padded(now.getMonth() + 1), padded(now.getDate())].join('-')
}

function padded(part: number): string {
  return `${part}`.padStart(2, '0')
}
