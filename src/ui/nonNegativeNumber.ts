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
  return { value: Number(trimmed), invalid: false };
}
