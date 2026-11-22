import {
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { WeightTableData } from '../catalogue/catalogue';
import type { EchoEvaluationResult } from '../calculation/protocol';
import { IconButton } from '../ui/IconButton';
import { CrossIcon, SlidersIcon } from '../ui/icons';
import { formatChance, formatEchoScore } from './format';
import { INVALID_NUMBER_MESSAGE, parseNonNegativeNumber } from '../ui/nonNegativeNumber';
import { Term } from '../ui/Term';
import { CustomTag, TableOptions } from './TableOptions';
import { TERM_TOOLTIPS } from './termTooltips';
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
  customTables: readonly WeightTableData[];
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
  /** Opens the weights dialog on a listed table. */
  onOpenWeights(name: string): void;
  /** Opens the weights dialog on a new blank table: "New Custom Weight Table…". */
  onNewTable(): void;
}

/** The add picker's value for "New Custom Weight Table…": table names are trimmed, so none starts with a space. */
const NEW_TABLE = ' new';

const NONE = '—';

/** The "Substat Weight Tables" list: the only place tables are picked on Echo Evaluation. */
export function WeightTableList({
  customTables,
  builtInTables,
  rows,
  focused,
  onAdd,
  onSwap,
  onRemove,
  onFocus,
  onTargetsChange,
  onOpenWeights,
  onNewTable,
}: WeightTableListProps) {
  const listedNames = new Set(rows.map((row) => row.name));
  const customNames = new Set(customTables.map((table) => table.name));
  /** A picker's groups, keeping only the tables `offered`. */
  const options = (offered: (table: WeightTableData) => boolean) => (
    <TableOptions custom={customTables.filter(offered)} builtIn={builtInTables.filter(offered)} />
  );

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
            <col className={styles.scoreColumn} />
            <col className={styles.chanceColumn} />
            <col className={styles.chanceColumn} />
            <col className={styles.iconColumn} />
            <col className={styles.iconColumn} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">
                <Term tooltip={TERM_TOOLTIPS['Substat Weight Table']}>Weight Table</Term>
              </th>
              <th scope="col">
                <Term tooltip={TERM_TOOLTIPS['Target Score']}>Target Score</Term>
              </th>
              <th scope="col">
                <Term tooltip={TERM_TOOLTIPS['ER Target Score']}>ER Target Score</Term>
              </th>
              <th scope="col" className={styles.figureHeader}>
                <Term tooltip={TERM_TOOLTIPS['Echo Score']}>Echo Score</Term>
              </th>
              <th scope="col" className={styles.figureHeader}>
                <Term tooltip={TERM_TOOLTIPS['Target Chance']}>Target Chance</Term>
              </th>
              <th scope="col" className={styles.figureHeader}>
                <Term tooltip={TERM_TOOLTIPS['ER Target Chance']}>ER Target Chance</Term>
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
                isCustom={customNames.has(row.name)}
                options={options(
                  (table) => table.name === row.name || !listedNames.has(table.name),
                )}
                onFocus={() => onFocus(row.name)}
                onSwap={(name) => onSwap(index, name)}
                onRemove={() => {
                  focusAfterRemoving.current = index;
                  onRemove(index);
                }}
                onTargetsChange={(targets) => onTargetsChange(row.name, targets)}
                onOpenWeights={() => onOpenWeights(row.name)}
              />
            ))}
          </tbody>
        </table>
      )}
      <select
        ref={addRef}
        className={styles.add}
        data-add=""
        aria-label="Add a Weight Table"
        value=""
        onChange={(event) => {
          if (event.target.value === NEW_TABLE) onNewTable();
          else onAdd(event.target.value);
        }}
      >
        <option value="" disabled>
          {rows.length ? 'Add another Weight Table…' : 'Choose a Weight Table…'}
        </option>
        {options((table) => !listedNames.has(table.name))}
        <option value={NEW_TABLE}>New Custom Weight Table…</option>
      </select>
    </section>
  );
}

// Clicking a row's controls never changes focus; clicking anywhere else in the row does.
const isControl = (target: EventTarget) =>
  target instanceof Element && target.closest('button, input, select, a, label') !== null;

function Row({
  row,
  isFocused,
  isCustom,
  options,
  onFocus,
  onSwap,
  onRemove,
  onTargetsChange,
  onOpenWeights,
}: {
  row: ListedRow;
  isFocused: boolean;
  isCustom: boolean;
  options: ReactNode;
  onFocus(): void;
  onSwap(name: string): void;
  onRemove(): void;
  onTargetsChange(targets: TargetTexts): void;
  onOpenWeights(): void;
}) {
  const { name, result } = row;
  const errorId = useId();
  const targetInvalid = parseNonNegativeNumber(row.targetText).invalid;
  const erTargetInvalid = parseNonNegativeNumber(row.erTargetText).invalid;

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
        <div className={styles.nameCell}>
          <select
            className={styles.picker}
            title={name}
            aria-label={`Swap ${name} for another Weight Table`}
            value={name}
            onChange={(event) => onSwap(event.target.value)}
          >
            {options}
          </select>
          {isCustom && <CustomTag />}
        </div>
      </td>
      <td className={styles.targetCell}>
        <TargetInput
          label={`Target Score for ${name}`}
          text={row.targetText}
          invalid={targetInvalid}
          errorId={errorId}
          onChange={(targetText) => onTargetsChange({ targetText, erTargetText: row.erTargetText })}
        />
        {/* One error line for both boxes, in a line every row keeps free; it may run across the next columns. */}
        <span id={errorId} className={styles.error}>
          {targetInvalid || erTargetInvalid ? INVALID_NUMBER_MESSAGE : ''}
        </span>
      </td>
      <td className={styles.targetCell}>
        <TargetInput
          label={`ER Target Score for ${name}`}
          text={row.erTargetText}
          invalid={erTargetInvalid}
          errorId={errorId}
          onChange={(erTargetText) => onTargetsChange({ targetText: row.targetText, erTargetText })}
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
        <IconButton
          label={`Weights of ${name}`}
          icon={<SlidersIcon />}
          data-weights=""
          onClick={onOpenWeights}
        />
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

/** A target box; when invalid it is described by the row's one error line, `errorId`. */
function TargetInput({
  label,
  text,
  invalid,
  errorId,
  onChange,
}: {
  label: string;
  text: string;
  invalid: boolean;
  errorId: string;
  onChange(text: string): void;
}) {
  return (
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
  );
}
