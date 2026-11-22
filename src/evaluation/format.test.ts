import { describe, expect, it } from 'vitest';
import {
  formatChance,
  formatEchoScore,
  formatEchoesStarted,
  formatRate,
  formatSubstatValue,
  formatTopPercent,
  formatWhole,
} from './format';

// Number formats, spec §17.
describe('number formats', () => {
  it('shows an Echo Score with 2 decimals', () => {
    expect(formatEchoScore(0)).toBe('0.00');
    expect(formatEchoScore(23.456)).toBe('23.46');
    expect(formatEchoScore(7)).toBe('7.00');
  });

  it('shows a chance as a percentage with 2 decimals', () => {
    expect(formatChance(0.3412)).toBe('34.12%');
    expect(formatChance(1)).toBe('100.00%');
    expect(formatChance(0.0001)).toBe('0.01%');
  });

  it('shows "<0.01%" above 0 but below 0.01%, and "0%" for exactly 0', () => {
    expect(formatChance(0.00009)).toBe('<0.01%');
    expect(formatChance(1e-12)).toBe('<0.01%');
    expect(formatChance(0)).toBe('0%');
  });

  it('prefixes Top Percent with "Top "', () => {
    expect(formatTopPercent(0.05)).toBe('Top 5.00%');
    expect(formatTopPercent(0)).toBe('Top 0%');
    expect(formatTopPercent(0.00001)).toBe('Top <0.01%');
  });

  it('shows Substat values as the game does', () => {
    expect(formatSubstatValue('Critical_Rate', 8.1)).toBe('8.1%');
    expect(formatSubstatValue('Critical_Damage', 15)).toBe('15%');
    expect(formatSubstatValue('Hp_Flat', 430)).toBe('430');
    expect(formatSubstatValue('Def_Flat', 50)).toBe('50');
  });
});

describe('Upgrade Strategy number formats', () => {
  it('shows a Success Rate or Discard Rate with 1 decimal, "<0.1%" above 0 but below that', () => {
    expect(formatRate(0.4567)).toBe('45.7%');
    expect(formatRate(1)).toBe('100.0%');
    expect(formatRate(0)).toBe('0.0%');
    expect(formatRate(0.001)).toBe('0.1%');
    expect(formatRate(0.0009)).toBe('<0.1%');
  });

  it('shows Echo EXP, Tuners and Shell Credits as whole numbers with thousands separators', () => {
    expect(formatWhole(1234567.4)).toBe('1,234,567');
    expect(formatWhole(999.5)).toBe('1,000');
    expect(formatWhole(0)).toBe('0');
  });

  it('shows Echoes started per Successful Echo with 2 decimals', () => {
    expect(formatEchoesStarted(3.456)).toBe('3.46');
  });
});
