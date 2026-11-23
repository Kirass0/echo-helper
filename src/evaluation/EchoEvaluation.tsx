import { useCallback, useEffect, useMemo, useState } from 'react';
import { BUILT_IN_TABLES, findTable, type WeightTableData } from '../catalogue/catalogue';
import type { Calculator } from '../calculation/newestInputWins';
import { deleteCustomTable, saveCustomTable } from '../customTables/customTableEdits';
import type { TableEvents } from '../customTables/tableEvents';
import type {
  EchoEvaluationListInput,
  EchoEvaluationResult,
  ListedTableInput,
} from '../calculation/protocol';
import {
  CALCULATION_FAILED,
  CalculatingSlot,
  CalculationStatus,
  fadedWhen,
  type CalculationState,
} from '../ui/CalculationStatus';
import { LiveRegion, type Announcement } from '../ui/LiveRegion';
import surfaces from '../ui/surfaces.module.css';
import { useLongPending } from '../ui/useLongPending';
import { forgetTable, renameTable } from './rememberedByName';
import { EchoDistributionChart } from './EchoDistributionChart';
import { formatChance, formatEchoScore } from './format';
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
  /** Called with each table added to the list, a new Custom one included. */
  onTableAdded?: (name: string) => void;
  /** Where renames and deletions of Custom tables are told to, and heard from, every tab. */
  tableEvents: TableEvents;
}

const NO_TARGETS: TargetTexts = { targetText: '', erTargetText: '' };

/** The Echo Evaluation tab: Your Echo on the left; results and the Substat Weight Tables list on the right. */
export function EchoEvaluation({
  calculator,
  builtInTables = BUILT_IN_TABLES,
  customTables,
  onCustomTablesChange,
  onTableAdded,
  tableEvents,
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
  const { results, stateOf, settled } = useEchoEvaluationResults(calculator, input);
  // The chart shows every listed table: it fades while any is calculating, and says so if any was given up.
  const listedStates = listed.map(stateOf);
  const chartState: CalculationState = listedStates.includes('failed')
    ? 'failed'
    : listedStates.includes('calculating')
      ? 'calculating'
      : 'done';
  const focusedState = focused === null ? 'done' : stateOf(focused);
  const focusedResult = focused === null ? undefined : results[focused];
  // A calculation failure is spoken as soon as it shows (spec §15): the focused table's as the Results panel says it,
  // another listed table's named.
  const failedOther = listed.find((name) => name !== focused && stateOf(name) === 'failed');
  const announcement: Announcement | null =
    focusedState === 'failed'
      ? { message: CALCULATION_FAILED }
      : failedOther !== undefined
        ? { message: `${failedOther}: ${CALCULATION_FAILED}` }
        : focused !== null && focusedResult && settled(focused)
          ? { line: settledLine(focusedResult) }
          : null;

  function add(name: string) {
    update((state) => ({ listed: [...state.listed, name], focused: name }));
    onTableAdded?.(name);
  }

  // A Custom table renamed or deleted, here or on the other tab, takes along, or forgets, what is remembered under its
  // name.
  useEffect(
    () =>
      tableEvents.subscribe((event) =>
        update((remembered) =>
          event.kind === 'renamed'
            ? renameTable(remembered, event.from, event.to)
            : forgetTable(remembered, event.name),
        ),
      ),
    [tableEvents, update],
  );

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

  const edits = { customTables, onCustomTablesChange, tableEvents };

  /**
   * A new table goes at the end of the list, in focus; a renamed one takes along what was remembered under its name,
   * as this tab hears the rename it publishes.
   */
  function saveTable(editing: string | null, table: WeightTableData) {
    saveCustomTable(edits, editing, table);
    if (editing === null) add(table.name);
  }

  function deleteTable(name: string) {
    deleteCustomTable(edits, name);
    setDialog(null);
  }

  return (
    <div className={styles.layout}>
      <LiveRegion announcement={announcement} />
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
                <CalculatingSlot state={focusedState} className={styles.calculatingSlot} />
              </h2>
              {focusedState === 'failed' && <CalculationStatus state="failed" />}
              <div className={fadedWhen(focusedState !== 'done')}>
                <ResultBoxes result={results[focused] ?? null} />
              </div>
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
              state={chartState}
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
              state: stateOf(name),
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
 * The line spoken once the focused table's results settle (spec §15): its Target Chance, Reached or Not reached at
 * 5/5, or its Echo Score if it has no Target Score.
 */
function settledLine(result: EchoEvaluationResult): string {
  if (result.fullyTuned && result.reachesTarget !== null)
    return `Target Score: ${result.reachesTarget ? 'Reached' : 'Not reached'}`;
  if (!result.fullyTuned && result.targetChance !== null)
    return `Target Chance: ${formatChance(result.targetChance)}`;
  return `Echo Score: ${formatEchoScore(result.echoScore)}`;
}

/** What came back for a table: for which input, and whether it was a result or the calculation was given up. */
interface Answer {
  readonly input: EchoEvaluationListInput;
  readonly failed: boolean;
}

/**
 * The newest result for each listed table: every change is sent at once, with no debounce, and each table's result
 * replaces its last one as soon as it arrives; results of outdated inputs are dropped. Each table is `calculating`
 * once its result has been pending for about 300 ms (spec §11), and `failed` once its calculation is given up; its
 * last result stays meanwhile.
 */
function useEchoEvaluationResults(calculator: Calculator, input: EchoEvaluationListInput | null) {
  const [results, setResults] = useState<Readonly<Record<string, EchoEvaluationResult>>>({});
  const [answers, setAnswers] = useState<Readonly<Record<string, Answer>>>({});
  useEffect(() => {
    if (!input) return;
    const answer = (tableName: string, failed: boolean) =>
      setAnswers((last) => ({ ...last, [tableName]: { input, failed } }));
    calculator.evaluate(
      input,
      (result) => {
        setResults((last) => ({ ...last, [result.tableName]: result }));
        answer(result.tableName, false);
      },
      (tableName) => answer(tableName, true),
    );
  }, [calculator, input]);

  const names = input?.tables.map(({ table }) => table.name) ?? [];
  const calculating = useLongPending(names.filter((name) => answers[name]?.input !== input));
  const stateOf = (name: string): CalculationState => {
    const answer = answers[name];
    if (answer?.input === input && answer.failed) return 'failed';
    return calculating.has(name) ? 'calculating' : 'done';
  };
  /** Whether a table's result for the newest input has come. */
  const settled = (name: string) => {
    const answer = answers[name];
    return answer?.input === input && !answer.failed;
  };
  return { results, stateOf, settled };
}
