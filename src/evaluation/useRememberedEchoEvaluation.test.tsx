import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ECHO_EVALUATION_KEY } from './echoEvaluationEntry';
import { useRememberedEchoEvaluation } from './useRememberedEchoEvaluation';

const exists = () => true;
const saved = () =>
  (JSON.parse(localStorage.getItem(ECHO_EVALUATION_KEY) ?? 'null') as { data: unknown } | null)
    ?.data;

describe('useRememberedEchoEvaluation', () => {
  it('keeps every change made before the next render', () => {
    const { result } = renderHook(() => useRememberedEchoEvaluation(exists));
    act(() => {
      const [, update] = result.current;
      update({ listed: ['Atk only'], focused: 'Atk only' });
      update({ targets: { 'Atk only': { targetText: '7', erTargetText: '' } } });
    });
    const expected = {
      substats: [],
      listed: ['Atk only'],
      focused: 'Atk only',
      targets: { 'Atk only': { targetText: '7', erTargetText: '' } },
    };
    expect(result.current[0]).toEqual(expected);
    expect(saved()).toEqual(expected);
  });

  it('builds a change on the newest state when given a function', () => {
    const { result } = renderHook(() => useRememberedEchoEvaluation(exists));
    act(() => {
      const [, update] = result.current;
      update({ listed: ['Atk only'] });
      update((state) => ({ listed: [...state.listed, 'HP only'] }));
    });
    expect(result.current[0].listed).toEqual(['Atk only', 'HP only']);
  });
});
