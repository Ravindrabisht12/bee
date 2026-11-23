const useColor = !!process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (n: number) => (s: unknown) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : String(s));

export const bold = paint(1);
export const dim = paint(2);
export const red = paint(31);
export const green = paint(32);
export const yellow = paint(33);
export const cyan = paint(36);

let quiet = false;
export const setQuiet = (q: boolean) => { quiet = q; };
export const isQuiet = () => quiet;
export const log = (...a: unknown[]) => { if (!quiet) console.log(...a); };
export const warn = (m: string) => console.error(yellow('! ') + m);

/** Expected, user-facing failure: printed without a stack trace. */
export class BeeError extends Error {}
export const die = (m: string): never => { throw new BeeError(m); };

/** Shorten 40-char commit SHAs for display. */
export const short = (r?: string) => (r && /^[0-9a-f]{40}$/.test(r) ? r.slice(0, 10) : r ?? '');
