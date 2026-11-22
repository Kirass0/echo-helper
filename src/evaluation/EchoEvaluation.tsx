import { useCallback, useEffect, useMemo, useState } from 'react';
import { BUILT_IN_TABLES, findTable, type WeightTableData } from '../catalogue/catalogue';
import type { Calculator } from '../calculation/newestInputWins';
import type {
  EchoEvaluationListInput,
  EchoEvaluationResult,
  ListedTableInput,
} from '../calculation/protocol';
import surfaces from '../ui/surfaces.module.css';
import { forgetTable, renameTable } from './rememberedByName';
import { EchoDistributionChart } from './EchoDistributionChart';
import { withoutRows } from './echoEvaluationEntry';
import { ResultBoxes } from './ResultBoxes';
import { CustomTag } from './TableOptions';
import { parseNonNegativeNumber } from '../ui/nonNegativeNumber';
import { useRememberedEchoEvaluation } from './useRememberedEchoEvaluation';
import { WeightTableList, type TargetTexts } from './WeightTableList';
import { WeightsDialog, type WeightsDialogStart } from './WeightsDialog';
import { YourEcho } from './YourEcho';
import styles from './EchoEvaluation.module.css';

export interface EchoEvaluationProps {
  calculator: Calculator;
  builtInTables?: readonly WeightTableData[];
  /** The saved Custom tables. Calculations only see saved tables. */
  customTables: readonly WeightTableData[];
  /** Called with all Custom tables after one is saved, renamed or deleted. */
  onCustomTablesChange: (tables: readonly WeightTableData[]) => void;
}

const NO_TARGETS: TargetTexts = { targetText: '', erTargetText: '' };

/** The Echo Evaluation tab: Your Echo on the left; results and the Substat Weight Tables list on the right. */
export function EchoEvaluation({
  calculator,
  builtInTables = BUILT_IN_TABLES,
  customTables,
  onCustomTablesChange: setCustomTables,
}: EchoEvaluationProps) {
  const allTables = useMemo(
    () => [...customTables, ...builtInTables],
    [customTables, builtInTables],
  );
  const exists = useCallback(
    (name: string) => findTable(allTables, name) !== undefined,
    [allTables],
  );
  const [{ substats, listed, focused, targets }, update] = useRememberedEchoEvaluation(exists);
  const targetsOf = (name: string) => targets[name] ?? NO_TARGETS;
  const [dialog, setDialog] = useState<WeightsDialogStart | null>(null);
  const isCustom = (name: string) => customTables.some((table) => table.name === name);

  const input = useMemo((): EchoEvaluationListInput | null => {
    const tables = listed.flatMap((name): ListedTableInput[] => {
      const table = findTable(allTables, name);
      if (!table) return [];
      const { targetText, erTargetText } = targets[name] ?? NO_TARGETS;
      return [
        {
          table,
          targetScore: parseNonNegativeNumber(targetText).value,
          erTargetScore: parseNonNegativeNumber(erTargetText).value,
        },
      ];
    });
    return tables.length ? { substats, tables, focusedTableName: focused } : null;
  }, [substats, listed, focused, targets, allTables]);
  const results = useEchoEvaluationResults(calculator, input);

  function add(name: string) {
    update((state) => ({ listed: [...state.listed, name], focused: name }));
  }

  function swap(index: number, name: string) {
    update((state) => {
      const old = state.listed[index];
      return {
        listed: state.listed.map((listedName, i) => (i === index ? name : listedName)),
        focused: state.focused === old ? name : state.focused,
      };
    });
  }

  /** Focus passes as from a vanished table: to the next row, or the row above. */
  function remove(index: number) {
    update((state) => withoutRows(state, (name) => name !== state.listed[index]));
  }

  /** A new table goes at the end of the list, in focus; a renamed one takes along what was remembered under its name. */
  function saveTable(editing: string | null, table: WeightTableData) {
    if (editing === null) {
      setCustomTables([...customTables, table]);
      add(table.name);
      return;
    }
    setCustomTables(customTables.map((custom) => (custom.name === editing ? table : custom)));
    if (table.name !== editing)
      update((remembered) => renameTable(remembered, editing, table.name));
  }

  function deleteTable(name: string) {
    setCustomTables(customTables.filter((table) => table.name !== name));
    update((remembered) => forgetTable(remembered, name));
    setDialog(null);
  }

  return (
    <div className={styles.layout}>
      <div className={`${surfaces.panel} ${styles.echo}`}>
        <YourEcho substats={substats} onChange={(changed) => update({ substats: changed })} />
      </div>
      <div className={styles.right}>
        <section className={surfaces.panel} aria-label="Results">
          {focused !== null ? (
            <>
              <h2 className={styles.tableName} title={focused}>
                <span className={styles.tableNameText}>{focused}</span>
                {isCustom(focused) && <CustomTag />}
              </h2>
              <ResultBoxes result={results[focused] ?? null} />
            </>
          ) : (
            <div className={styles.prompt}>
              <p className={styles.promptLine}>
                <strong>Pick a Substat Weight Table for your Resonator below.</strong>
              </p>
              <p className={styles.promptSmall}>
                Each table determines how much each Substat is worth to one Resonator. You can add
                more than one and switch between them.
              </p>
            </div>
          )}
        </section>
        {focused !== null && (
          <div className={surfaces.panel}>
            <EchoDistributionChart
              focused={focused}
              tables={listed.map((name) => ({
                name,
                targetScore: parseNonNegativeNumber(targetsOf(name).targetText).value,
                erTargetScore: parseNonNegativeNumber(targetsOf(name).erTargetText).value,
                result: results[name] ?? null,
              }))}
            />
          </div>
        )}
        <div className={surfaces.panel}>
          <WeightTableList
            customTables={customTables}
            builtInTables={builtInTables}
            rows={listed.map((name) => ({
              name,
              ...targetsOf(name),
              result: results[name] ?? null,
            }))}
            focused={focused}
            onAdd={add}
            onSwap={swap}
            onRemove={remove}
            onFocus={(name) => update({ focused: name })}
            onTargetsChange={(name, texts) =>
              update((state) => ({ targets: { ...state.targets, [name]: texts } }))
            }
            onOpenWeights={(name) => setDialog({ kind: 'view', name })}
            onNewTable={() => setDialog({ kind: 'new' })}
            weightsDialogOpen={dialog !== null}
          />
        </div>
      </div>
      {dialog && (
        <WeightsDialog
          start={dialog}
          customTables={customTables}
          builtInTables={builtInTables}
          onSave={saveTable}
          onDelete={deleteTable}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

/**
 * The newest result for each listed table: every change is sent at once, with no debounce, and each table's result
 * replaces its last one as soon as it arrives; results of outdated inputs are dropped.
 */
function useEchoEvaluationResults(
  calculator: Calculator,
  input: EchoEvaluationListInput | null,
): Readonly<Record<string, EchoEvaluationResult>> {
  const [results, setResults] = useState<Readonly<Record<string, EchoEvaluationResult>>>({});
  useEffect(() => {
    if (input)
      calculator.evaluate(input, (result) =>
        setResults((last) => ({ ...last, [result.tableName]: result })),
      );
  }, [calculator, input]);
  return results;
}
