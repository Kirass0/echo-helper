/** The Upgrade Strategy term tooltips, verbatim from the Answer of short-text ticket 17 (spec §10). Plain text only. */
export const STRATEGY_TOOLTIPS = {
  'Discard Rate':
    'The share of all Echoes that are discarded at this Tune Stage, not of those that reached it.',
  'Success Rate':
    'The share of all Echoes that pass every Tune Stage and become Successful Echoes.',
  'Cost per Successful Echo':
    'What one Successful Echo costs on average, counting the Echoes discarded on the way, after refunds.',
} as const;
