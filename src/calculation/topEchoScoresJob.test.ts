import { describe, expect, it } from 'vitest';
import { createTopEchoScoresJobs } from './topEchoScoresJob';

// Only Crit Rate is weighted: 6.0 per Reference Roll (7.5). A Top 10% Echo has Crit Rate 8.1 and a Top 5% one 9.3.
const critRateOnly = { name: 'Crit Rate only', weights: { Critical_Rate: 6 } };

describe('the Top Echo Scores job', () => {
  it('works out the Echo Score of a Top x% Echo for each x, in order', () => {
    const { echoScores } = createTopEchoScoresJobs().run({
      table: critRateOnly,
      topPercents: [0.1, 0.05],
    });

    expect(echoScores).toHaveLength(2);
    expect(echoScores[0]).toBeCloseTo((6 * 8.1) / 7.5, 12);
    expect(echoScores[1]).toBeCloseTo((6 * 9.3) / 7.5, 12);
  });

  it('builds the distribution once for a table whose weights are unchanged', () => {
    const jobs = createTopEchoScoresJobs();
    jobs.run({ table: critRateOnly, topPercents: [0.1] });
    jobs.run({ table: { ...critRateOnly, name: 'Renamed' }, topPercents: [0.05] });
    expect(jobs.built.distributions).toBe(1);
    jobs.run({ table: { name: 'Atk only', weights: { Atk_Percent: 1 } }, topPercents: [0.05] });
    expect(jobs.built.distributions).toBe(2);
  });
});
