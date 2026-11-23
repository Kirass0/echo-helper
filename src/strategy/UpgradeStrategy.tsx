import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Calculator } from '../calculation/newestInputWins';
import type { StrategyName } from '../calculation/protocol';
import { BUILT_IN_TABLES, findTable, type WeightTableData } from '../catalogue/catalogue';
import { deleteCustomTable, saveCustomTable } from '../customTables/customTableEdits';
import type { TableEvents } from '../customTables/tableEvents';
import { NEW_TABLE, TableOptions } from '../evaluation/TableOptions';
import { formatRate } from '../evaluation/format';
import { TERM_TOOLTIPS } from '../evaluation/termTooltips';
import { WeightsDialog, type WeightsDialogStart } from '../evaluation/WeightsDialog';
import { CALCULATION_FAILED, CalculatingSlot, CalculationStatus } from '../ui/CalculationStatus';
import { LiveRegion, type Announcement } from '../ui/LiveRegion';
import { FittedSelect } from '../ui/FittedSelect';
import { IconButton } from '../ui/IconButton';
import { SlidersIcon } from '../ui/icons';
import { scrollToTop } from '../ui/reducedMotion';
import surfaces from '../ui/surfaces.module.css';
import { Term } from '../ui/Term';
import { usePhoneLayout } from '../ui/usePhoneLayout';
import compare from './Compare.module.css';
import { CompareBlock } from './CompareBlock';
import { ExamplePicker } from './ExamplePicker';
import { ResultsBar, ResultsPanel, unfinishedMessage } from './ResultsPanel';
import { StageEditor } from './StageEditor';
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
  /** Where renames and deletions of Custom tables are told to every tab; the app follows a rename of the table. */
  tableEvents: TableEvents;
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

const CHOOSE = 'Choose a Weight Table…';

/**
 * The Upgrade Strategy tab (spec §8): the header, then one strategy's five Tune Stages and results, or, while comparing,
 * Strategy A and Strategy B side by side above "B compared with A".
 */
export function UpgradeStrategy({
  calculator,
  builtInTables = BUILT_IN_TABLES,
  customTables,
  onCustomTablesChange,
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
  const phone = usePhoneLayout();
  const resultsRef = useRef<HTMLElement>(null);
  // The strategies open as remembered; with nothing remembered, A is "Crit first" (spec §6).
  const a = useStrategy(calculator, 'A', table, true, () => remembered.a);
  // Strategy B exists only while comparing; it is calculated after A (spec §11).
  const [comparing, setComparing] = useState(remembered.b !== null);
  const b = useStrategy(calculator, 'B', table, comparing, () => remembered.b ?? emptyStrategy());
  // Which strategies show in Edit while comparing; the others show their Done summary.
  const [editing, setEditing] = useState(() => openingModes(remembered));
  // On a phone, the one strategy shown while comparing (spec §14).
  const [shown, setShown] = useState<StrategyName>('B');

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
    setShown('B');
    setComparing(true);
  }

  /** Keeps A and discards B. */
  function stopComparing() {
    setComparing(false);
    b.reset(emptyStrategy());
  }

  /** The phone's "Results" link: the full results panel comes into view and takes focus. */
  function showResults() {
    const panel = resultsRef.current;
    if (!panel) return;
    scrollToTop(panel);
    panel.focus({ preventScroll: true });
  }

  // On a phone, one strategy's results follow it in a sticky bar; there is none while comparing (spec §14).
  const barShown = phone && !!table && !comparing && a.result !== null;

  const edits = { customTables, onCustomTablesChange, tableEvents };

  /** A new table becomes the strategy's table; a renamed one stays it, as the app follows the rename published. */
  function saveTable(editing: string | null, saved: WeightTableData) {
    saveCustomTable(edits, editing, saved);
    if (editing === null) onTableChange(saved.name);
  }

  function deleteTable(name: string) {
    deleteCustomTable(edits, name);
    setDialog(null);
  }

  const shownStrategies = comparing ? { A: a, B: b } : { A: a };
  const announcement = table ? announce(shownStrategies) : null;

  return (
    <div className={`${styles.layout} ${barShown ? styles.withBar : ''}`}>
      <LiveRegion announcement={announcement} />
      <div className={styles.head}>
        <span className={styles.field}>
          <Term tooltip={TERM_TOOLTIPS['Substat Weight Table']}>Substat Weight Table</Term>
          <FittedSelect
            shown={table ? table.name : CHOOSE}
            fitClassName={styles.pickerFit}
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
          </FittedSelect>
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
        <div className={surfaces.panel}>
          <p className={styles.prompt}>
            Pick a Substat Weight Table above to build an Upgrade Strategy.
          </p>
        </div>
      ) : comparing ? (
        <>
          {phone && (
            <div className={compare.switch} role="group" aria-label="Strategy shown">
              {(['A', 'B'] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={shown === name}
                  onClick={() => setShown(name)}
                >
                  Strategy {name}
                </button>
              ))}
            </div>
          )}
          <div className={compare.columns}>
            {(phone ? [shown] : (['A', 'B'] as const)).map((name) => (
              <StrategyPanel
                key={name}
                name={name}
                strategy={name === 'A' ? a : b}
                editing={editing[name]}
                onEditingChange={(now) => setEditing((was) => ({ ...was, [name]: now }))}
              />
            ))}
          </div>
          <CompareBlock a={a.result} b={b.result} stale={faded(a) || faded(b)} stacked={phone} />
        </>
      ) : (
        <div className={styles.columns}>
          <div className={surfaces.panel}>
            <StageEditor
              draft={a.draft}
              discardRates={discardRates(a)}
              stale={faded(a)}
              calculating={a.calculating}
              onChange={a.setDraft}
            />
          </div>
          <ResultsPanel
            ref={resultsRef}
            result={a.result}
            stale={faded(a)}
            unfinishedStage={a.unfinishedStage}
            state={a.state}
          />
        </div>
      )}
      {barShown && a.result && (
        <ResultsBar
          result={a.result}
          stale={faded(a)}
          state={a.state}
          onShowResults={showResults}
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
 * What the live region says (spec §15): a strategy's failure or unfinished-rule message, named while comparing, as soon
 * as it shows; else, once every strategy's results settle, the Success Rate, or A's and B's while comparing. The phone's
 * sticky bar repeats the Success Rate unspoken.
 */
function announce(strategies: Partial<Record<StrategyName, HeldStrategy>>): Announcement | null {
  const held = Object.entries(strategies) as [StrategyName, HeldStrategy][];
  const named = (name: StrategyName, text: string) =>
    held.length > 1 ? `Strategy ${name}: ${text}` : text;
  for (const [name, { state, unfinishedStage }] of held) {
    if (state === 'failed') return { message: named(name, CALCULATION_FAILED) };
    if (unfinishedStage !== null)
      return { message: named(name, unfinishedMessage(unfinishedStage)) };
  }
  if (!held.every(([, { settled }]) => settled)) return null;
  const rates = held.map(([name, { result }]) =>
    held.length > 1
      ? `${name} ${formatRate(result?.successRate ?? 0)}`
      : formatRate(result?.successRate ?? 0),
  );
  return { line: `Success Rate: ${rates.join(', ')}` };
}

/** Whether a strategy's results fade: they are from before its last change, calculating, or couldn't be calculated. */
const faded = ({ waiting, state }: HeldStrategy) => waiting || state !== 'done';

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
        <CalculatingSlot state={strategy.state} />
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
      {strategy.state === 'failed' && <CalculationStatus state="failed" />}
      {unfinished !== null && (
        <p className={compare.staleMessage}>{unfinishedMessage(unfinished)}</p>
      )}
      {editing || unfinished !== null ? (
        <StageEditor
          draft={strategy.draft}
          discardRates={discardRates(strategy)}
          stale={faded(strategy)}
          calculating={strategy.calculating}
          narrow
          onChange={strategy.setDraft}
        />
      ) : (
        <StrategySummary draft={strategy.draft} result={strategy.result} stale={faded(strategy)} />
      )}
    </section>
  );
}
