import type { SubstatType } from './gameData';

/** The weight of each Substat type for one Resonator. A Substat type the table doesn't list has a weight of 0. */
export interface SubstatWeightTable {
  readonly name: string;
  weightOf(type: SubstatType): number;
}

/** Builds a Substat Weight Table. The weights are copied in, so the table can't change after it is built. */
export function substatWeightTable(
  name: string,
  weights: Readonly<Partial<Record<SubstatType, number>>>,
): SubstatWeightTable {
  const copied = new Map(Object.entries(weights) as [SubstatType, number][]);
  return Object.freeze({ name, weightOf: (type: SubstatType) => copied.get(type) ?? 0 });
}
