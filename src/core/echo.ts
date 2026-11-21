import {
  MAX_TUNE_STAGE,
  SUBSTAT_TYPES,
  possibleRolls,
  referenceRoll,
  substatTiers,
  type SubstatType,
} from './gameData';
import type { RandomSource } from './random';
import type { SubstatWeightTable } from './substatWeightTable';

/**
 * An Echo with up to five Substats. The Substats keep the order they were added in, which is the order their
 * contributions are summed in, so Echo Scores stay bit-exact with the source.
 */
export class Echo {
  readonly #substats = new Map<SubstatType, number>();

  /** The Substats in the order they were revealed. */
  get substats(): ReadonlyMap<SubstatType, number> {
    return this.#substats;
  }

  /** How many Substats have been revealed, from 0 to 5. */
  get tuneStage(): number {
    return this.#substats.size;
  }

  addSubstat(type: SubstatType, value: number): void {
    this.#throwIfFullyTuned();
    if (this.#substats.has(type)) throw new Error(`The Echo already has a ${type} Substat.`);
    this.#substats.set(type, value);
  }

  /** Reveals Substats as tuning does: a uniform pick from the types it lacks, and a value drawn by tier weight. */
  tune(random: RandomSource, times = 1): void {
    for (let i = 0; i < times; i++) {
      this.#throwIfFullyTuned();
      const unused = SUBSTAT_TYPES.filter((type) => !this.#substats.has(type));
      const type = unused[random.nextInt(unused.length)]!;
      this.#substats.set(type, rollValue(type, random));
    }
  }

  tuneToMax(random: RandomSource): void {
    while (this.tuneStage < MAX_TUNE_STAGE) this.tune(random);
  }

  clone(): Echo {
    const copy = new Echo();
    for (const [type, value] of this.#substats) copy.#substats.set(type, value);
    return copy;
  }

  #throwIfFullyTuned() {
    if (this.tuneStage >= MAX_TUNE_STAGE)
      throw new Error(`Echo cannot be tuned beyond Tune Stage ${MAX_TUNE_STAGE}.`);
  }
}

function rollValue(type: SubstatType, random: RandomSource): number {
  const { values, weights } = substatTiers(type);
  let roll = random.nextInt(weights.reduce((total, weight) => total + weight, 0));
  for (let tier = 0; ; tier++) {
    roll -= weights[tier]!;
    if (roll < 0) return values[tier]!;
  }
}

/** The Echo Score of an Echo: each Substat's contribution, summed in the order the Substats were added. */
export function echoScore(echo: Echo, table: SubstatWeightTable): number {
  let score = 0.0;
  for (const [type, value] of echo.substats) score += substatScore(type, value, table);
  return score;
}

/** What one Substat adds to the Echo Score, parenthesised exactly as the source does. */
export function substatScore(type: SubstatType, value: number, table: SubstatWeightTable): number {
  return table.weightOf(type) * (value / referenceRoll(type));
}

/** What a roll of a Substat type adds to the Echo Score, with its chance. */
export interface ScoreRoll {
  readonly score: number;
  readonly chance: number;
}

/** Each roll of a Substat type as Echo Score added, merged by exactly equal score; a type weighted 0 has a single roll. */
export function scoreRolls(type: SubstatType, table: SubstatWeightTable): ScoreRoll[] {
  const byScore = new Map<number, number>();
  for (const roll of possibleRolls(type)) {
    const score = substatScore(type, roll.value, table);
    byScore.set(score, (byScore.get(score) ?? 0) + roll.chance);
  }
  return [...byScore].map(([score, chance]) => ({ score, chance }));
}
