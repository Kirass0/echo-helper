/** What a box for a number of 0 or more holds (a Target Score, an ER Target Score, a weight): a number, nothing, or something invalid. */
export interface ParsedNumber {
  /** The number, or null when the box is empty or invalid: an invalid entry counts as empty. */
  readonly value: number | null;
  readonly invalid: boolean;
}

export const INVALID_NUMBER_MESSAGE = 'Enter a number of 0 or more.';

// A plain decimal number: "20", "20.5", ".5", "20."; no signs, exponents or separators.
const DECIMAL = /^(\d+\.?\d*|\.\d+)$/;

export function parseNonNegativeNumber(text: string): ParsedNumber {
  const trimmed = text.trim();
  if (trimmed === '') return { value: null, invalid: false };
  if (!DECIMAL.test(trimmed)) return { value: null, invalid: true };
  const value = Number(trimmed);
  // Enough digits overflow to Infinity, which isn't a number of 0 or more (spec §5: a finite number).
  if (!Number.isFinite(value)) return { value: null, invalid: true };
  return { value, invalid: false };
}

/**
 * A number of 0 or more as text the parser above accepts: plain decimal, never exponent form (`1e-7` is written
 * `0.0000001`, `1e21` is `1000000000000000000000`). It holds the same digits as `String(value)`, so it reads back as
 * exactly the same number.
 */
export function formatNonNegativeNumber(value: number): string {
  const text = String(value);
  const exponentForm = /^(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
  if (!exponentForm) return text;
  const [, whole = '', fraction = '', exponentText = '0'] = exponentForm;
  const digits = whole + fraction;
  // Where the decimal point falls in `digits`.
  const point = whole.length + Number(exponentText);
  if (point <= 0) return `0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return digits + '0'.repeat(point - digits.length);
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
}
