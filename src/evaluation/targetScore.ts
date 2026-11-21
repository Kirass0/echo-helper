/** What a Target Score or ER Target Score box holds: a number, nothing, or something that isn't a valid target. */
export interface ParsedTarget {
  /** The target, or null when the box is empty or invalid: an invalid target counts as empty. */
  readonly value: number | null;
  readonly invalid: boolean;
}

export const INVALID_TARGET_MESSAGE = 'Enter a number of 0 or more.';

// A plain decimal number: "20", "20.5", ".5", "20."; no signs, exponents or separators.
const DECIMAL = /^(\d+\.?\d*|\.\d+)$/;

export function parseTarget(text: string): ParsedTarget {
  const trimmed = text.trim();
  if (trimmed === '') return { value: null, invalid: false };
  if (!DECIMAL.test(trimmed)) return { value: null, invalid: true };
  return { value: Number(trimmed), invalid: false };
}
