import { describe, expect, it } from 'vitest';
import type { UpgradeStrategyResult } from '../calculation/protocol';
import { compareStrategies, relativeChange } from './comparison';

describe('relativeChange', () => {
  it('reads B’s change against A to 1 decimal, with its sign', () => {
    expect(relativeChange(100, 112.3, 'higher')?.text).toBe('+12.3%');
    expect(relativeChange(50, 48, 'higher')?.text).toBe('−4.0%');
  });

  it('is better when lower for a cost and when higher for an Echo Score', () => {
    expect(relativeChange(10, 8, 'lower')?.verdict).toBe('better');
    expect(relativeChange(10, 12, 'lower')?.verdict).toBe('worse');
    expect(relativeChange(10, 12, 'higher')?.verdict).toBe('better');
    expect(relativeChange(10, 8, 'higher')?.verdict).toBe('worse');
  });

  it('calls values equal when they are, or when the change rounds to 0.0%', () => {
    expect(relativeChange(10, 10, 'lower')).toEqual({ text: '0.0%', verdict: 'equal' });
    expect(relativeChange(1000, 1000.4, 'lower')).toEqual({ text: '0.0%', verdict: 'equal' });
  });

  it('is missing when either side has no value, or A is 0 and B isn’t', () => {
    expect(relativeChange(null, 5, 'lower')).toBeNull();
    expect(relativeChange(5, null, 'lower')).toBeNull();
    expect(relativeChange(0, 5, 'higher')).toBeNull();
    expect(relativeChange(0, 0, 'higher')?.verdict).toBe('equal');
  });
});

const result = (
  cost: { echoes: number; exp: number; tuners: number; shellCredits: number } | null,
  average: number | null,
  lowest: number | null,
) =>
  ({
    successRate: cost ? 1 / cost.echoes : 0,
    discards: [],
    costPerSuccessfulEcho: cost,
    averageSuccessfulEchoScore: average,
    lowestSuccessfulEchoScore: lowest,
  }) as unknown as UpgradeStrategyResult;

describe('compareStrategies', () => {
  it('has the four cost rows and the two Echo Score rows, and no Success Rate row', () => {
    const a = result({ echoes: 10, exp: 1000, tuners: 100, shellCredits: 500 }, 12, 8);
    const rows = compareStrategies(a, a);
    expect(rows.map(({ label }) => label)).toEqual([
      'Echoes started per Successful Echo',
      'Echo EXP per Successful Echo',
      'Tuners per Successful Echo',
      'Shell Credits per Successful Echo',
      'Average Echo Score of Successful Echoes',
      'Lowest Echo Score of a Successful Echo',
    ]);
  });

  it('formats each side as the results panel does, and compares B with A', () => {
    const a = result({ echoes: 10, exp: 261334, tuners: 310, shellCredits: 145925 }, 12.68, 8.89);
    const b = result({ echoes: 12.5, exp: 200000, tuners: 310, shellCredits: 150000 }, 13.81, 8);
    const rows = compareStrategies(a, b);
    expect(rows.map(({ a, b, change }) => [a, b, change?.text, change?.verdict])).toEqual([
      ['10.00', '12.50', '+25.0%', 'worse'],
      ['261,334', '200,000', '−23.5%', 'better'],
      ['310', '310', '0.0%', 'equal'],
      ['145,925', '150,000', '+2.8%', 'worse'],
      ['12.68', '13.81', '+8.9%', 'better'],
      ['8.89', '8.00', '−10.0%', 'worse'],
    ]);
  });

  it('leaves the change empty, and shows "—", for a side with no Successful Echoes', () => {
    const a = result({ echoes: 10, exp: 1000, tuners: 100, shellCredits: 500 }, 12, 8);
    const none = result(null, null, null);
    for (const row of compareStrategies(a, none)) {
      expect(row.b).toBe('—');
      expect(row.change).toBeNull();
    }
    expect(compareStrategies(null, a).every(({ a, change }) => a === '—' && !change)).toBe(true);
  });
});
