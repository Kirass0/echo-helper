import { useEffect, useMemo, useRef, useState } from 'react';
import type { Calculator } from '../calculation/newestInputWins';
import type { UpgradeStrategyInput, UpgradeStrategyResult } from '../calculation/protocol';
import { BUILT_IN_TABLES, findTable, type WeightTableData } from '../catalogue/catalogue';
import type { TableEvents } from '../customTables/tableEvents';
import { TableOptions } from '../evaluation/TableOptions';
import { TERM_TOOLTIPS } from '../evaluation/termTooltips';
import { WeightsDialog, type WeightsDialogStart } from '../evaluation/WeightsDialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { IconButton } from '../ui/IconButton';
import { SlidersIcon } from '../ui/icons';
import surfaces from '../ui/surfaces.module.css';
import { Term } from '../ui/Term';
import { EXAMPLE_NAMES, fillThresholds, loadExample, type LoadedExample } from './examples';
import { ResultsPanel } from './ResultsPanel';
import { StageEditor } from './StageEditor';
import { finishedStrategy, type StrategyDraft } from './strategyDraft';
import styles from './UpgradeStrategy.module.css';

export interface UpgradeStrategyProps {
  calculator: Calculator;
  builtInTables?: readonly WeightTableData[];
  /** The saved Custom tables. */
  customTables: readonly WeightTableData[];
  /** Called with all Custom tables after one is saved, renamed or deleted. */
  onCustomTablesChange: (tables: readonly WeightTableData[]) => void;
  /** The selected table's name; null, or a table that no longer exists, means no table. */
  tableName: string | null;
  onTableChange: (name: string) => void;
  /** Where renames and deletions of Custom tables are told to the other tabs. */
  tableEvents?: TableEvents;
}

/** The picker's value for "New Custom Weight Table…": table names are trimmed, so none starts with a space. */
const NEW_TABLE = ' new';
const CHOOSE = 'Choose a Weight Table…';

const hasRules = (draft: StrategyDraft) => draft.stages.some((boxes) => boxes.length > 0);

/** The Upgrade Strategy tab with one strategy (spec §8): the header, the five Tune Stages and the results. */
export function UpgradeStrategy({
  calculator,
  builtInTables = BUILT_IN_TABLES,
  customTables,
  onCustomTablesChange: setCustomTables,
  tableName,
  onTableChange,
  tableEvents,
}: UpgradeStrategyProps) {
  const allTables = useMemo(
    () => [...customTables, ...builtInTables],
    [customTables, builtInTables],
  );
  const table = tableName === null ? undefined : findTable(allTables, tableName);
  // Nothing is remembered yet (ticket 18), so every visit is a first visit: "Crit first" with no table (spec §6).
  const [draft, setDraft] = useState<StrategyDraft>(() => loadExample('Crit first').draft);
  const [dialog, setDialog] = useState<WeightsDialogStart | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const pending = usePendingThresholds(calculator, table, setDraft);

  const finished = useMemo(() => finishedStrategy(draft), [draft]);
  // While an example's Top x% thresholds are pending, the results wait.
  const input = useMemo(
    (): UpgradeStrategyInput | null =>
      table && !pending.example && 'strategy' in finished
        ? { strategy: finished.strategy, table }
        : null,
    [table, finished, pending.example],
  );
  const result = useUpgradeStrategyResult(calculator, input);
  const unfinishedStage =
    !pending.example && 'unfinishedStage' in finished ? finished.unfinishedStage : null;
  const waiting = pending.example !== null || unfinishedStage !== null;

  /** Replaces the strategy with an example; one with rules is replaced only once confirmed. */
  function chooseExample(name: string) {
    if (hasRules(draft)) setReplacing(name);
    else replaceWith(name);
  }

  function replaceWith(name: string) {
    const loaded = loadExample(name);
    setDraft(loaded.draft);
    pending.load(loaded);
  }

  /** A new table becomes the strategy's table; a renamed one stays it, and the other tabs follow the rename. */
  function saveTable(editing: string | null, saved: WeightTableData) {
    if (editing === null) {
      setCustomTables([...customTables, saved]);
      onTableChange(saved.name);
      return;
    }
    setCustomTables(customTables.map((custom) => (custom.name === editing ? saved : custom)));
    if (saved.name !== editing) {
      if (tableName === editing) onTableChange(saved.name);
      tableEvents?.publish({ kind: 'renamed', from: editing, to: saved.name });
    }
  }

  function deleteTable(name: string) {
    setCustomTables(customTables.filter((custom) => custom.name !== name));
    tableEvents?.publish({ kind: 'deleted', name });
    setDialog(null);
  }

  return (
    <div className={styles.layout}>
      <div className={styles.head}>
        <span className={styles.field}>
          <Term tooltip={TERM_TOOLTIPS['Substat Weight Table']}>Substat Weight Table</Term>
          {/* A hidden copy of what the picker shows sets its width, in every browser; the picker fills it. */}
          <span className={styles.pickerFit}>
            <span className={styles.pickerSizer} aria-hidden="true">
              {table ? table.name : CHOOSE}
            </span>
            <select
              className={styles.tablePicker}
              title={table?.name}
              aria-label="Substat Weight Table"
              value={table ? table.name : ''}
              onChange={(event) => {
                if (event.target.value === NEW_TABLE) setDialog({ kind: 'new' });
                else onTableChange(event.target.value);
              }}
            >
              {!table && (
                <option value="" disabled>
                  {CHOOSE}
                </option>
              )}
              <TableOptions custom={customTables} builtIn={builtInTables} />
              <option value={NEW_TABLE}>New Custom Weight Table…</option>
            </select>
          </span>
          {table && (
            <IconButton
              label={`Weights of ${table.name}`}
              icon={<SlidersIcon />}
              onClick={() => setDialog({ kind: 'view', name: table.name })}
            />
          )}
        </span>
        {/* Comparing comes with ticket 17. */}
        <label className={styles.field}>
          Start from an example
          {/* As wide as "Choose…", which it always shows, as in the prototype. */}
          <span className={styles.pickerFit}>
            <span className={styles.pickerSizer} aria-hidden="true">
              Choose…
            </span>
            <select
              className={styles.tablePicker}
              disabled={!table}
              value=""
              onChange={(event) => {
                if (event.target.value) chooseExample(event.target.value);
              }}
            >
              <option value="">Choose…</option>
              {EXAMPLE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <button type="button" className={styles.button} disabled={!table}>
          Compare with another strategy
        </button>
      </div>
      {table ? (
        <div className={styles.columns}>
          <div className={surfaces.panel}>
            <StageEditor
              draft={draft}
              discardRates={result?.discards.map(({ discardRate }) => discardRate) ?? null}
              stale={waiting}
              calculating={pending.example?.thresholds ?? []}
              onChange={setDraft}
            />
          </div>
          <ResultsPanel result={result} stale={waiting} unfinishedStage={unfinishedStage} />
        </div>
      ) : (
        <p className={styles.prompt}>
          Pick a Substat Weight Table above to build an Upgrade Strategy.
        </p>
      )}
      {replacing !== null && (
        <ConfirmDialog
          message={`Replace your current strategy with '${replacing}'? This can't be undone.`}
          confirm="Replace"
          onConfirm={() => {
            setReplacing(null);
            replaceWith(replacing);
          }}
          onCancel={() => setReplacing(null)}
        />
      )}
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
 * The loaded example whose Top x% thresholds are still being worked out, if any (spec §8, "Example strategies"). They
 * are worked out for the selected table, and filled into the strategy once that table's distribution is ready. A newer
 * example, or another table, supersedes a pending one: only the newest request's result is passed on.
 */
function usePendingThresholds(
  calculator: Calculator,
  table: WeightTableData | undefined,
  setDraft: (change: (draft: StrategyDraft) => StrategyDraft) => void,
) {
  const [example, setExample] = useState<LoadedExample | null>(null);
  const newest = useRef<LoadedExample | null>(null);

  useEffect(() => {
    if (!example || !table) return;
    calculator.topEchoScores({ table, topPercents: example.topPercents }, ({ echoScores }) => {
      if (newest.current !== example) return;
      newest.current = null;
      setDraft((draft) => fillThresholds(draft, example, echoScores));
      setExample(null);
    });
  }, [calculator, example, table, setDraft]);

  return {
    example,
    /** Starts working out a just-loaded example's thresholds; one without any has nothing pending. */
    load(loaded: LoadedExample) {
      const waiting = loaded.topPercents.length > 0 ? loaded : null;
      newest.current = waiting;
      setExample(waiting);
    },
  };
}

/**
 * The newest result of the strategy: every valid change is sent at once, with no debounce; results of outdated
 * inputs are dropped. While a rule is unfinished nothing is sent, and the last result stays.
 */
function useUpgradeStrategyResult(
  calculator: Calculator,
  input: UpgradeStrategyInput | null,
): UpgradeStrategyResult | null {
  const [result, setResult] = useState<UpgradeStrategyResult | null>(null);
  useEffect(() => {
    if (input) calculator.calculateUpgradeStrategy(input, setResult);
  }, [calculator, input]);
  return result;
}
