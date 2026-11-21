import { useId, useLayoutEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import type { WeightTableData } from '../catalogue/catalogue';
import type { EchoEvaluationResult } from '../calculation/protocol';
import { IconButton } from '../ui/IconButton';
import { CrossIcon, SlidersIcon } from '../ui/icons';
import { formatChance, formatEchoScore } from './format';
import { INVALID_TARGET_MESSAGE, parseTarget } from './targetScore';
import styles from './WeightTableList.module.css';

/** What is typed in a table's two target boxes. */
export interface TargetTexts {
  readonly targetText: string;
  readonly erTargetText: string;
}

/** A listed table: its targets and its latest result. */
export interface ListedRow extends TargetTexts {
  readonly name: string;
  readonly result: EchoEvaluationResult | null;
}

export interface WeightTableListProps {
  builtInTables: readonly WeightTableData[];
  rows: readonly ListedRow[];
  /** The name of the table in focus. */
  focused: string | null;
  onAdd(name: string): void;
  /** Replaces the table of the row at this index. */
  onSwap(index: number, name: string): void;
  onRemove(index: number): void;
  onFocus(name: string): void;
  onTargetsChange(name: string, targets: TargetTexts): void;
}

const NONE = '—';

/** The "Substat Weight Tables" list: the only place tables are picked on Echo Evaluation. */
export function WeightTableList({
  builtInTables,
  rows,
  focused,
  onAdd,
  onSwap,
  onRemove,
  onFocus,
  onTargetsChange,
}: WeightTableListProps) {
  const sorted = [...builtInTables].sort((a, b) => a.name.localeCompare(b.name));
  const listedNames = new Set(rows.map((row) => row.name));
  const unlisted = sorted.filter((table) => !listedNames.has(table.name));

  // A row's × moves focus to the next row's ×, or to the add picker (spec §15), once the row is gone.
  const tableRef = useRef<HTMLTableElement>(null);
  const addRef = useRef<HTMLSelectElement>(null);
  const focusAfterRemoving = useRef<number | null>(null);
  useLayoutEffect(() => {
    const index = focusAfterRemoving.current;
    if (index === null) return;
    focusAfterRemoving.current = null;
    const removeButtons = tableRef.current?.querySelectorAll<HTMLElement>('[data-remove]');
    (removeButtons?.[index] ?? addRef.current)?.focus();
  }, [rows]);

  return (
    <section className={styles.list} aria-labelledby="weight-tables-heading">
      <h2 id="weight-tables-heading" className={styles.heading}>
        Substat Weight Tables
      </h2>
      {rows.length > 0 && (
        <table ref={tableRef} className={styles.table}>
          <colgroup>
            <col className={styles.nameColumn} />
            <col className={styles.targetColumn} />
            <col className={styles.targetColumn} />
            <col className={styles.figureColumn} />
            <col className={styles.figureColumn} />
            <col className={styles.figureColumn} />
            <col className={styles.iconColumn} />
            <col className={styles.iconColumn} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Weight Table</th>
              <th scope="col">Target Score</th>
              <th scope="col">ER Target Score</th>
              <th scope="col" className={styles.figureHeader}>
                Echo Score
              </th>
              <th scope="col" className={styles.figureHeader}>
                Target Chance
              </th>
              <th scope="col" className={styles.figureHeader}>
                ER Target Chance
              </th>
              <th scope="col">
                <span className={styles.hidden}>Weights</span>
              </th>
              <th scope="col">
                <span className={styles.hidden}>Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <Row
                key={index}
                row={row}
                isFocused={row.name === focused}
                choices={sorted.filter(
                  (table) => table.name === row.name || !listedNames.has(table.name),
                )}
                onFocus={() => onFocus(row.name)}
                onSwap={(name) => onSwap(index, name)}
                onRemove={() => {
                  focusAfterRemoving.current = index;
                  onRemove(index);
                }}
                onTargetsChange={(targets) => onTargetsChange(row.name, targets)}
              />
            ))}
          </tbody>
        </table>
      )}
      <select
        ref={addRef}
        className={styles.add}
        aria-label="Add a Weight Table"
        value=""
        onChange={(event) => onAdd(event.target.value)}
      >
        <option value="" disabled>
          {rows.length ? 'Add another Weight Table…' : 'Choose a Weight Table…'}
        </option>
        <TableOptions tables={unlisted} />
      </select>
    </section>
  );
}

/** A picker's tables: the Built-in group, alphabetical (the Custom group comes with Custom tables). */
function TableOptions({ tables }: { tables: readonly WeightTableData[] }) {
  if (tables.length === 0) return null;
  return (
    <optgroup label="Built-in">
      {tables.map((table) => (
        <option key={table.name} value={table.name}>
          {table.name}
        </option>
      ))}
    </optgroup>
  );
}

// Clicking a row's controls never changes focus; clicking anywhere else in the row does.
const isControl = (target: EventTarget) =>
  target instanceof Element && target.closest('button, input, select, a, label') !== null;

function Row({
  row,
  isFocused,
  choices,
  onFocus,
  onSwap,
  onRemove,
  onTargetsChange,
}: {
  row: ListedRow;
  isFocused: boolean;
  choices: readonly WeightTableData[];
  onFocus(): void;
  onSwap(name: string): void;
  onRemove(): void;
  onTargetsChange(targets: TargetTexts): void;
}) {
  const { name, result } = row;

  function handleClick(event: MouseEvent) {
    if (!isControl(event.target)) onFocus();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onFocus();
    }
  }

  return (
    <tr
      tabIndex={0}
      aria-current={isFocused ? 'true' : undefined}
      className={isFocused ? styles.focused : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <td>
        <select
          className={styles.picker}
          title={name}
          aria-label={`Swap ${name} for another Weight Table`}
          value={name}
          onChange={(event) => onSwap(event.target.value)}
        >
          <TableOptions tables={choices} />
        </select>
      </td>
      <td>
        <TargetInput
          label={`Target Score for ${name}`}
          text={row.targetText}
          onChange={(targetText) => onTargetsChange({ ...row, targetText })}
        />
      </td>
      <td>
        <TargetInput
          label={`ER Target Score for ${name}`}
          text={row.erTargetText}
          onChange={(erTargetText) => onTargetsChange({ ...row, erTargetText })}
        />
      </td>
      <td className={styles.figure}>{result ? formatEchoScore(result.echoScore) : NONE}</td>
      <td className={styles.figure}>
        <Chance result={result} chance={(r) => r.targetChance} verdict={(r) => r.reachesTarget} />
      </td>
      <td className={styles.figure}>
        <Chance
          result={result}
          chance={(r) => r.erTargetChance}
          verdict={(r) => r.reachesErTarget}
        />
      </td>
      <td className={styles.icon}>
        {/* The weights dialog comes with Custom tables (ticket 13); until then the button does nothing. */}
        <IconButton label={`Weights of ${name}`} icon={<SlidersIcon />} />
      </td>
      <td className={styles.icon}>
        <IconButton
          label={`Remove ${name}`}
          icon={<CrossIcon />}
          danger
          data-remove=""
          onClick={onRemove}
        />
      </td>
    </tr>
  );
}

/** A chance column: the chance, or Reached / Not reached at 5/5, or "—" when there is none. */
function Chance({
  result,
  chance,
  verdict,
}: {
  result: EchoEvaluationResult | null;
  chance(result: EchoEvaluationResult): number | null;
  verdict(result: EchoEvaluationResult): boolean | null;
}) {
  if (!result) return NONE;
  if (result.fullyTuned) {
    const reached = verdict(result);
    if (reached === null) return NONE;
    return (
      <span className={reached ? styles.good : styles.bad}>
        {reached ? 'Reached' : 'Not reached'}
      </span>
    );
  }
  const value = chance(result);
  return value === null ? NONE : formatChance(value);
}

function TargetInput({
  label,
  text,
  onChange,
}: {
  label: string;
  text: string;
  onChange(text: string): void;
}) {
  const errorId = useId();
  const { invalid } = parseTarget(text);
  return (
    <div className={styles.target}>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={styles.number}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        value={text}
        onChange={(event) => onChange(event.target.value)}
      />
      <span id={errorId} className={styles.error}>
        {invalid ? INVALID_TARGET_MESSAGE : ''}
      </span>
    </div>
  );
}
