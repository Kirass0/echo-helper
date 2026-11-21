import { describe, expect, it } from 'vitest';
import { roundTo12Decimals } from './index';

// Expected values are what .NET 9's Math.Round(x, 12) returns for the same doubles.
describe('roundTo12Decimals', () => {
  it.each([
    [2.5e-12, 2e-12],
    [3.5e-12, 4e-12],
    [0.5e-12, 0],
    [1.5e-12, 2e-12],
    [-2.5e-12, -2e-12],
    [1.0000000000005, 1],
    [0.1234567890125, 0.123456789012],
  ])('rounds a midpoint %d to the even neighbour, %d', (x, expected) => {
    expect(roundTo12Decimals(x)).toBe(expected);
  });

  it.each([
    [1.0000000000004, 1],
    [1.0000000000006, 1.000000000001],
    [12.345678901234567, 12.345678901235],
    [9.95, 9.95],
  ])('rounds %d to the nearest 12th decimal, %d', (x, expected) => {
    expect(roundTo12Decimals(x)).toBe(expected);
  });

  it('leaves a value of 1e16 or more as it is', () => {
    expect(roundTo12Decimals(1e17 + 0.5)).toBe(1e17 + 0.5);
  });
});
