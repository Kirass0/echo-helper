// Game data as it stands in the source Core (EchoHelperClaude, commit 53ce242).

/**
 * The Substat types, in the source's enum order. That order decides which missing types a finishing table adds first;
 * the names are the source's, so a Weight Table's weights can be keyed by them as in its JSON file.
 */
export const SUBSTAT_TYPES = [
  'Atk_Percent',
  'Atk_Flat',
  'Def_Percent',
  'Def_Flat',
  'Hp_Percent',
  'Hp_Flat',
  'Basic_Attack',
  'Skill',
  'Heavy',
  'Liberation',
  'Energy_Regen',
  'Critical_Rate',
  'Critical_Damage',
] as const;

export type SubstatType = (typeof SUBSTAT_TYPES)[number];

const SUBSTAT_TYPE_SET: ReadonlySet<unknown> = new Set(SUBSTAT_TYPES);

/** A Substat type's name, as in SUBSTAT_TYPES: for reading untrusted data. */
export const isSubstatType = (value: unknown): value is SubstatType => SUBSTAT_TYPE_SET.has(value);

export const MAX_TUNE_STAGE = 5;

const TIER_WEIGHTS: readonly number[] = [680, 777, 2039, 2428, 1748, 1457, 582, 291];
const CRIT_TIER_WEIGHTS: readonly number[] = [2333, 2333, 2333, 800, 800, 800, 300, 300];

const PERCENT_VALUES: readonly number[] = [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6];

const TIER_VALUES: Readonly<Record<SubstatType, readonly number[]>> = {
  Critical_Rate: [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5],
  Critical_Damage: [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21],
  Hp_Flat: [320, 360, 390, 430, 470, 510, 540, 580],
  Def_Percent: [8.1, 9, 10, 10.9, 11.8, 12.8, 13.8, 14.7],
  Energy_Regen: [6.8, 7.6, 8.4, 9.2, 10, 10.8, 11.6, 12.4],
  Atk_Flat: [30, 30, 40, 40, 50, 50, 60, 60],
  Def_Flat: [40, 40, 50, 50, 60, 60, 70, 70],
  Atk_Percent: PERCENT_VALUES,
  Hp_Percent: PERCENT_VALUES,
  Liberation: PERCENT_VALUES,
  Skill: PERCENT_VALUES,
  Heavy: PERCENT_VALUES,
  Basic_Attack: PERCENT_VALUES,
};

/** A value a Substat type can roll, and the chance of rolling it, in [0, 1]. */
export interface PossibleRoll {
  readonly value: number;
  readonly chance: number;
}

/** The eight roll tiers of a Substat type: each tier's value and integer weight. Flat types repeat values across tiers. */
export function substatTiers(type: SubstatType): {
  values: readonly number[];
  weights: readonly number[];
} {
  const weights =
    type === 'Critical_Rate' || type === 'Critical_Damage' ? CRIT_TIER_WEIGHTS : TIER_WEIGHTS;
  return { values: TIER_VALUES[type], weights };
}

const sum = (numbers: readonly number[]) => numbers.reduce((total, n) => total + n, 0);

// Built from the tiers a roll is drawn from, so the exact calculations and the sampling oracles can't disagree.
const POSSIBLE_ROLLS = new Map<SubstatType, readonly PossibleRoll[]>(
  SUBSTAT_TYPES.map((type) => {
    const { values, weights } = substatTiers(type);
    const byValue = new Map<number, number>();
    values.forEach((value, tier) => byValue.set(value, (byValue.get(value) ?? 0) + weights[tier]!));
    const total = sum(weights);
    const rolls = [...byValue].map(([value, weight]) =>
      Object.freeze({ value, chance: weight / total }),
    );
    return [type, Object.freeze(rolls)];
  }),
);

/** The distinct values a Substat type can roll, ascending, with their chances; tiers with equal values are merged. */
export function possibleRolls(type: SubstatType): readonly PossibleRoll[] {
  return POSSIBLE_ROLLS.get(type)!;
}

// The lowest value whose cumulative integer tier weight, doubled, reaches the total.
const REFERENCE_ROLLS = new Map<SubstatType, number>(
  SUBSTAT_TYPES.map((type) => {
    const { values, weights } = substatTiers(type);
    const total = sum(weights);
    let cumulative = 0;
    const tier = weights.findIndex((weight) => (cumulative += weight) * 2 >= total);
    return [type, values[tier]!];
  }),
);

/** The Reference Roll of a Substat type: its chance-weighted median roll, which rolled values are divided by. */
export function referenceRoll(type: SubstatType): number {
  return REFERENCE_ROLLS.get(type)!;
}
