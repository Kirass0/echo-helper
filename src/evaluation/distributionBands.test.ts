import { describe, expect, it } from 'vitest';
import { distributionBands, type ChartedTable, type DistributionBands } from './distributionBands';

const chancesOf = (bands: DistributionBands, name: string) => bands.chances.get(name) ?? [];

const table = (
  name: string,
  distribution: ChartedTable['distribution'],
  targets: Partial<Pick<ChartedTable, 'targetScore' | 'erTargetScore'>> = {},
): ChartedTable => ({ name, distribution, targetScore: null, erTargetScore: null, ...targets });

// Finishes at 0, 5 or 10 with chances 0.5, 0.3 and 0.2.
const steps = table('Steps', [
  { threshold: 0, chance: 1 },
  { threshold: 5, chance: 0.5 },
  { threshold: 10, chance: 0.2 },
]);

describe('the distribution chart’s bands', () => {
  it('span every listed table, from the lowest Worst to the highest Best Echo Score', () => {
    const bands = distributionBands([
      table('A', [
        { threshold: 8.2, chance: 1 },
        { threshold: 20, chance: 0.1 },
      ]),
      table('B', [
        { threshold: 10, chance: 1 },
        { threshold: 31.5, chance: 0.01 },
      ]),
    ]);
    expect([bands.from, bands.to]).toEqual([8.2, 31.5]);
  });

  it('widen to every table’s Target Score and ER Target Score; an empty target adds nothing', () => {
    const bands = distributionBands([
      { ...steps, name: 'A', targetScore: 14 },
      { ...steps, name: 'B', erTargetScore: -2 },
      { ...steps, name: 'C', targetScore: null, erTargetScore: null },
    ]);
    expect([bands.from, bands.to]).toEqual([-2, 14]);
  });

  it('cut the range into 60 equal bands, the same for every table', () => {
    const bands = distributionBands([steps, { ...steps, name: 'Other' }]);
    expect(bands.edges).toHaveLength(61);
    expect(bands.edges[0]).toBe(0);
    expect(bands.edges[60]).toBe(10);
    expect(bands.edges[30]).toBeCloseTo(5, 12);
    expect(bands.chances.get('Steps')).toHaveLength(60);
    expect(bands.chances.get('Other')).toHaveLength(60);
  });

  it('give each band the chance of finishing in it', () => {
    const chances = chancesOf(distributionBands([{ ...steps, targetScore: 12 }]), 'Steps');
    // 60 bands of 0.2 over 0–12: 0 is in band 0, 5 in band 25 and 10 in band 50.
    expect(chances[0]).toBeCloseTo(0.5, 12);
    expect(chances[25]).toBeCloseTo(0.3, 12);
    expect(chances[50]).toBeCloseTo(0.2, 12);
    expect(chances.reduce((sum, chance) => sum + chance, 0)).toBeCloseTo(1, 12);
    expect(chances.filter((chance) => chance > 1e-12)).toHaveLength(3);
  });

  it('put the Best Echo Score in the last band', () => {
    const chances = chancesOf(distributionBands([steps]), 'Steps');
    expect(chances[59]).toBeCloseTo(0.2, 12);
  });

  it('show a 5/5 Echo as a single band', () => {
    const bands = distributionBands([
      table('Done', [{ threshold: 7, chance: 1 }]),
      table('Open', [
        { threshold: 1, chance: 1 },
        { threshold: 13, chance: 0.5 },
      ]),
    ]);
    const done = chancesOf(bands, 'Done');
    expect(done[30]).toBeCloseTo(1, 12); // 7 is halfway from 1 to 13
    expect(done.filter((chance) => chance > 0)).toHaveLength(1);
  });

  it('give a lone 5/5 Echo without targets a range one Echo Score wide', () => {
    const bands = distributionBands([table('Done', [{ threshold: 7, chance: 1 }])]);
    expect([bands.from, bands.to]).toEqual([7, 8]);
    expect(chancesOf(bands, 'Done')[0]).toBe(1);
  });

  it('know the highest chance of any band of any table', () => {
    const bands = distributionBands([steps, table('Sure', [{ threshold: 3, chance: 1 }])]);
    expect(bands.highestChance).toBe(1);
  });
});
