/**
 * Pakistan mobile phone helpers shared by client and server.
 *
 * We normalise every customer phone number to E.164 (`+92XXXXXXXXXX`) before it
 * is validated, stored on an order, or used to contact the customer. Only
 * mobile numbers are accepted (national numbers start with `3`).
 */

export const PK_COUNTRY_CODE = "+92";

/**
 * Normalize a user-entered Pakistani phone number to E.164 (`+92XXXXXXXXXX`).
 * Accepts local (`0300…`), international (`+92…`, `0092…`) and bare (`3…`)
 * forms with spaces or dashes. Returns null when it is not a valid mobile.
 */
export function normalizePkPhone(raw: string): string | null {
  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  if (digits.startsWith("0092")) digits = digits.slice(4);
  else if (digits.startsWith("92")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  if (!/^3\d{9}$/.test(digits)) return null;
  return `+92${digits}`;
}

export function isValidPkPhone(raw: string): boolean {
  return normalizePkPhone(raw) !== null;
}

/** Human-readable form for display: +92 3xx xxxxxxx. */
export function formatPkPhone(value: string): string {
  const normalized = normalizePkPhone(value);
  const digits = (normalized ?? value).replace(/[^\d]/g, "").replace(/^92/, "");
  if (digits.length !== 10) return value;
  return `+92 ${digits.slice(0, 3)} ${digits.slice(3)}`;
}