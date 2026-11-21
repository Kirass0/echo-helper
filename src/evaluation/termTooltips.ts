/** The Echo Evaluation term tooltips, verbatim from the Answer of short-text ticket 17 (spec §10). Plain text only. */
export const TERM_TOOLTIPS = {
  'Substat Weight Table': 'Determines how much each Substat is worth.',
  'Echo Score':
    "The Echo's Substats added up, each counted by its weight in this table. Higher is better.",
  'Target Score': 'The Echo Score you aim for in a fully tuned Echo.',
  'ER Target Score': 'The Echo Score you aim for in a fully tuned Echo that also has Energy Regen.',
  'Target Chance': 'The chance that this Echo, once fully tuned, reaches your Target Score.',
  'ER Target Chance':
    'The chance that this Echo, once fully tuned, has Energy Regen and reaches your ER Target Score.',
  'Top Percent':
    'The share of all fully tuned Echoes with a higher Echo Score. Top 5% means only 1 in 20 is better.',
  'ER Top Percent':
    'The share of all fully tuned Echoes that have Energy Regen and a higher Echo Score.',
} as const;

export type EvaluationTerm = keyof typeof TERM_TOOLTIPS;
