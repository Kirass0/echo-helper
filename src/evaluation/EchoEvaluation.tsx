import { useCallback, useEffect, useMemo, useState } from 'react';
import { BUILT_IN_TABLES, type WeightTableData } from '../catalogue/catalogue';
import type { Calculator } from '../calculation/newestInputWins';
import type {
  EchoEvaluationListInput,
  EchoEvaluationResult,
  ListedTableInput,
} from '../calculation/protocol';
import surfaces from '../ui/surfaces.module.css';
import { forgetTable, renameTable, type RememberedByName } from './customTables';
import { EchoDistributionChart } from './EchoDistributionChart';
import { ResultBoxes } from './ResultBoxes';
import { CustomTag } from './TableOptions';
import { parseTarget } from './targetScore';
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
  const exists = useCallback(
    (name: string) => [...customTables, ...builtInTables].some((table) => table.name === name),
    [customTables, builtInTables],
  );
  const [{ substats, listed, focused, targets }, update] = useRememberedEchoEvaluation(exists);
  const targetsOf = (name: string) => targets[name] ?? NO_TARGETS;
  const [dialog, setDialog] = useState<WeightsDialogStart | null>(null);
  const isCustom = (name: string) => customTables.some((table) => table.name === name);

  const input = useMemo((): EchoEvaluationListInput | null => {
    const tables = listed.flatMap((name): ListedTableInput[] => {
      const table = [...customTables, ...builtInTables].find(
        (candidate) => candidate.name === name,
      );
      if (!table) return [];
      const { targetText, erTargetText } = targets[name] ?? NO_TARGETS;
      return [
        {
          table,
          targetScore: parseTarget(targetText).value,
          erTargetScore: parseTarget(erTargetText).value,
        },
      ];
    });
    return tables.length ? { substats, tables, focusedTableName: focused } : null;
  }, [substats, listed, focused, targets, customTables, builtInTables]);
  const results = useEchoEvaluationResults(calculator, input);

  function add(name: string) {
    update({ listed: [...listed, name], focused: name });
  }

  function swap(index: number, name: string) {
    const old = listed[index];
    update({
      listed: listed.map((listedName, i) => (i === index ? name : listedName)),
      focused: focused === old ? name : focused,
    });
  }

  function remove(index: number) {
    const removed = listed[index];
    update({
      listed: listed.filter((_, i) => i !== index),
      focused: focused === removed ? (listed[index + 1] ?? listed[index - 1] ?? null) : focused,
    });
  }

  function remember(change: (remembered: RememberedByName) => RememberedByName) {
    update(change({ listed, focused, targets }));
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
      remember((remembered) => renameTable(remembered, editing, table.name));
  }

  function deleteTable(name: string) {
    setCustomTables(customTables.filter((table) => table.name !== name));
    remember((remembered) => forgetTable(remembered, name));
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
                targetScore: parseTarget(targetsOf(name).targetText).value,
                erTargetScore: parseTarget(targetsOf(name).erTargetText).value,
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
            onTargetsChange={(name, texts) => update({ targets: { ...targets, [name]: texts } })}
            onOpenWeights={(name) => setDialog({ kind: 'view', name })}
            onNewTable={() => setDialog({ kind: 'new' })}
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
