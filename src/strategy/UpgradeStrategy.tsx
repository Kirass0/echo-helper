import { useEffect, useId, useMemo, useState } from 'react';
import type { Calculator } from '../calculation/newestInputWins';
import type { StrategyName } from '../calculation/protocol';
import { BUILT_IN_TABLES, findTable, type WeightTableData } from '../catalogue/catalogue';
import type { TableEvents } from '../customTables/tableEvents';
import { TableOptions } from '../evaluation/TableOptions';
import { TERM_TOOLTIPS } from '../evaluation/termTooltips';
import { WeightsDialog, type WeightsDialogStart } from '../evaluation/WeightsDialog';
import { IconButton } from '../ui/IconButton';
import { SlidersIcon } from '../ui/icons';
import surfaces from '../ui/surfaces.module.css';
import { Term } from '../ui/Term';
import compare from './Compare.module.css';
import { CompareBlock } from './CompareBlock';
import { ExamplePicker } from './ExamplePicker';
import { ResultsPanel } from './ResultsPanel';
import { stageName, StageEditor } from './StageEditor';
import { emptyStrategy, finishedStrategy, type StrategyDraft } from './strategyDraft';
import { StrategySummary } from './StrategySummary';
import styles from './UpgradeStrategy.module.css';
import { useStrategy, type HeldStrategy } from './useStrategy';

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
  /** The strategies as remembered: Strategy A and, while comparing, Strategy B (spec §12). */
  strategies: RememberedStrategies;
  /** Called with both strategies whenever either changes, or compare mode starts or stops. */
  onStrategiesChange: (strategies: RememberedStrategies) => void;
}

export interface RememberedStrategies {
  readonly a: StrategyDraft;
  /** Strategy B while comparing; null otherwise. */
  readonly b: StrategyDraft | null;
}

const holdsUnfinishedRule = (draft: StrategyDraft) => 'unfinishedStage' in finishedStrategy(draft);

/** How each strategy opens: in Done, unless it holds an unfinished rule (spec §12). */
const openingModes = ({ a, b }: RememberedStrategies): Record<StrategyName, boolean> => ({
  A: holdsUnfinishedRule(a),
  B: b !== null && holdsUnfinishedRule(b),
});

/** The picker's value for "New Custom Weight Table…": table names are trimmed, so none starts with a space. */
const NEW_TABLE = ' new';
const CHOOSE = 'Choose a Weight Table…';

/**
 * The Upgrade Strategy tab (spec §8): the header, then one strategy's five Tune Stages and results, or, while comparing,
 * Strategy A and Strategy B side by side above "B compared with A".
 */
export function UpgradeStrategy({
  calculator,
  builtInTables = BUILT_IN_TABLES,
  customTables,
  onCustomTablesChange: setCustomTables,
  tableName,
  onTableChange,
  tableEvents,
  strategies: remembered,
  onStrategiesChange,
}: UpgradeStrategyProps) {
  const allTables = useMemo(
    () => [...customTables, ...builtInTables],
    [customTables, builtInTables],
  );
  const table = tableName === null ? undefined : findTable(allTables, tableName);
  const [dialog, setDialog] = useState<WeightsDialogStart | null>(null);
  // The strategies open as remembered; with nothing remembered, A is "Crit first" (spec §6).
  const a = useStrategy(calculator, 'A', table, true, () => remembered.a);
  // Strategy B exists only while comparing; it is calculated after A (spec §11).
  const [comparing, setComparing] = useState(remembered.b !== null);
  const b = useStrategy(calculator, 'B', table, comparing, () => remembered.b ?? emptyStrategy());
  // Which strategies show in Edit while comparing; the others show their Done summary.
  const [editing, setEditing] = useState(() => openingModes(remembered));

  // Every change to either strategy, or to compare mode, is remembered. What another tab saves remounts the tab.
  const heldA = a.draft;
  const heldB = comparing ? b.draft : null;
  useEffect(() => {
    if (heldA !== remembered.a || heldB !== remembered.b)
      onStrategiesChange({ a: heldA, b: heldB });
  }, [heldA, heldB, remembered, onStrategiesChange]);

  /** A becomes Strategy A, in Done unless it holds an unfinished rule, beside an empty Strategy B in Edit. */
  function startComparing() {
    b.reset(emptyStrategy());
    setEditing({ A: a.unfinishedStage !== null, B: true });
    setComparing(true);
  }

  /** Keeps A and discards B. */
  function stopComparing() {
    setComparing(false);
    b.reset(emptyStrategy());
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
        {/* While comparing, each strategy has its own example picker. */}
        {!comparing && <ExamplePicker draft={a.draft} disabled={!table} onLoad={a.loadExample} />}
        <button
          type="button"
          className={styles.button}
          disabled={!table && !comparing}
          onClick={comparing ? stopComparing : startComparing}
        >
          {comparing ? 'Stop comparing' : 'Compare with another strategy'}
        </button>
      </div>
      {!table ? (
        <p className={styles.prompt}>
          Pick a Substat Weight Table above to build an Upgrade Strategy.
        </p>
      ) : comparing ? (
        <>
          <div className={compare.columns}>
            {(['A', 'B'] as const).map((name) => (
              <StrategyPanel
                key={name}
                name={name}
                strategy={name === 'A' ? a : b}
                editing={editing[name]}
                onEditingChange={(now) => setEditing((was) => ({ ...was, [name]: now }))}
              />
            ))}
          </div>
          <CompareBlock a={a.result} b={b.result} stale={a.waiting || b.waiting} />
        </>
      ) : (
        <div className={styles.columns}>
          <div className={surfaces.panel}>
            <StageEditor
              draft={a.draft}
              discardRates={discardRates(a)}
              stale={a.waiting}
              calculating={a.calculating}
              onChange={a.setDraft}
            />
          </div>
          <ResultsPanel result={a.result} stale={a.waiting} unfinishedStage={a.unfinishedStage} />
        </div>
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

const discardRates = ({ result }: HeldStrategy) =>
  result?.discards.map(({ discardRate }) => discardRate) ?? null;

/**
 * One strategy's half of compare mode (spec §8, "Comparing two strategies"): headed "Strategy A" or "Strategy B", with
 * its own example picker and an Edit/Done button. Edit looks like the one-strategy editor, Discard Rates included;
 * Done shows a summary. A strategy holding an unfinished rule stays in Edit.
 */
function StrategyPanel({
  name,
  strategy,
  editing,
  onEditingChange,
}: {
  name: StrategyName;
  strategy: HeldStrategy;
  editing: boolean;
  onEditingChange(editing: boolean): void;
}) {
  const headingId = useId();
  const unfinished = strategy.unfinishedStage;
  return (
    <section className={surfaces.panel} aria-labelledby={headingId}>
      <h2 className={compare.heading}>
        <span id={headingId}>Strategy {name}</span>
        <button
          type="button"
          className={`${compare.button} ${editing ? compare.primary : ''}`}
          disabled={editing && unfinished !== null}
          onClick={() => onEditingChange(!editing)}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </h2>
      <div className={compare.examples}>
        <ExamplePicker draft={strategy.draft} onLoad={strategy.loadExample} />
      </div>
      {unfinished !== null && (
        <p className={compare.staleMessage}>
          Results are from before your last change. Finish the highlighted rule at{' '}
          {stageName(unfinished)} to update them.
        </p>
      )}
      {editing || unfinished !== null ? (
        <StageEditor
          draft={strategy.draft}
          discardRates={discardRates(strategy)}
          stale={strategy.waiting}
          calculating={strategy.calculating}
          narrow
          onChange={strategy.setDraft}
        />
      ) : (
        <StrategySummary draft={strategy.draft} result={strategy.result} stale={strategy.waiting} />
      )}
    </section>
  );
}
