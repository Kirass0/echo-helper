import { describe, expect, it } from 'vitest';
import { forgetTable, renameTable } from './rememberedByName';

describe('what is remembered under a table name', () => {
  const remembered = {
    listed: ['Mornye', 'Mine', 'Aemeath'],
    focused: 'Mine',
    targets: {
      Mine: { targetText: '20', erTargetText: '15' },
      Mornye: { targetText: '30', erTargetText: '' },
    },
  };

  it('carries the targets, list rows and focus over to the new name on rename', () => {
    expect(renameTable(remembered, 'Mine', 'Ours')).toEqual({
      listed: ['Mornye', 'Ours', 'Aemeath'],
      focused: 'Ours',
      targets: {
        Ours: { targetText: '20', erTargetText: '15' },
        Mornye: { targetText: '30', erTargetText: '' },
      },
    });
  });

  it('forgets the targets on delete, and the rows go as for a vanished table', () => {
    expect(forgetTable(remembered, 'Mine')).toEqual({
      listed: ['Mornye', 'Aemeath'],
      focused: 'Aemeath',
      targets: { Mornye: { targetText: '30', erTargetText: '' } },
    });
    expect(forgetTable({ ...remembered, focused: 'Aemeath' }, 'Mine').focused).toBe('Aemeath');
    expect(forgetTable({ listed: ['Mine'], focused: 'Mine', targets: {} }, 'Mine').focused).toBe(
      null,
    );
  });
});
