/**
 * How long a sign-in code stays usable. The server sets it, and the email and the
 * page both quote it, so all three move together.
 */
export const SIGN_IN_CODE_TTL_MINUTES = 10

/**
 * How many wrong tries one sign-in code takes. The plugin enforces it and the page counts
 * up to it, so the page can say the code is dead on the try that kills it.
 */
export const SIGN_IN_CODE_WRONG_TRIES = 3
