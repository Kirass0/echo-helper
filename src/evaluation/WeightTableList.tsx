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
import { CalculationStatus, fadedWhen, type CalculationState } from '../ui/CalculationStatus';
import { IconButton } from '../ui/IconButton';
import { FittedSelect } from '../ui/FittedSelect';
import { CrossIcon, SlidersIcon } from '../ui/icons';
import { formatChance, formatEchoScore } from './format';
import { INVALID_NUMBER_MESSAGE, parseNonNegativeNumber } from '../ui/nonNegativeNumber';
import { Term } from '../ui/Term';
import { usePhoneLayout } from '../ui/usePhoneLayout';
import { CustomTag, NEW_TABLE, TableOptions } from './TableOptions';
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
  /** Whether its result is calculating for a while, or was given up; the last result then stays, faded. */
  readonly state?: CalculationState;
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
  /** Whether the weights dialog is open: when it closes with its opener gone, the list places focus. */
  weightsDialogOpen: boolean;
}

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
  weightsDialogOpen,
}: WeightTableListProps) {
  const listedNames = new Set(rows.map((row) => row.name));
  const customNames = new Set(customTables.map((table) => table.name));
  /** A picker's groups, keeping only the tables `offered`. */
  const options = (offered: (table: WeightTableData) => boolean) => (
    <TableOptions custom={customTables.filter(offered)} builtIn={builtInTables.filter(offered)} />
  );

  const phone = usePhoneLayout();
  /** The table, or on a phone the list of cards. */
  const rowsRef = useRef<HTMLElement | null>(null);
  const setRowsElement = (element: HTMLElement | null) => {
    rowsRef.current = element;
  };

  // A row's × moves focus to the next row's ×, or to the add picker (spec §15), once the row is gone.
  const addRef = useRef<HTMLSelectElement>(null);
  const focusAfterRemoving = useRef<number | null>(null);
  useLayoutEffect(() => {
    const index = focusAfterRemoving.current;
    if (index === null) return;
    focusAfterRemoving.current = null;
    const removeButtons = rowsRef.current?.querySelectorAll<HTMLElement>('[data-remove]');
    (removeButtons?.[index] ?? addRef.current)?.focus();
  }, [rows]);

  // The weights dialog gives focus back to its opener. When that is gone with its row (the table deleted, here or in
  // another tab), focus goes to the sliders of the row taking its place, or of the row above if it was last, else to
  // the add picker: as a row's × does (spec §15).
  /** The index of the row whose sliders opened the dialog; null when the add picker did. */
  const dialogOpenedFrom = useRef<number | null>(null);
  const dialogWasOpen = useRef(weightsDialogOpen);
  useLayoutEffect(() => {
    const closed = dialogWasOpen.current && !weightsDialogOpen;
    dialogWasOpen.current = weightsDialogOpen;
    if (!closed) return;
    if (document.activeElement !== null && document.activeElement !== document.body) return;
    const row = dialogOpenedFrom.current;
    const sliders = rowsRef.current?.querySelectorAll<HTMLElement>('[data-weights]');
    const next = row === null ? undefined : (sliders?.[row] ?? sliders?.[row - 1]);
    (next ?? addRef.current)?.focus();
  }, [weightsDialogOpen]);

  /** What a row, or a card, shows and does. */
  const rowProps = (row: ListedRow, index: number): RowProps => ({
    row,
    isFocused: row.name === focused,
    isCustom: customNames.has(row.name),
    options: options((table) => table.name === row.name || !listedNames.has(table.name)),
    onFocus: () => onFocus(row.name),
    onSwap: (name) => onSwap(index, name),
    onRemove: () => {
      focusAfterRemoving.current = index;
      onRemove(index);
    },
    onTargetsChange: (targets) => onTargetsChange(row.name, targets),
    onOpenWeights: () => {
      dialogOpenedFrom.current = index;
      onOpenWeights(row.name);
    },
  });

  return (
    <section className={styles.list} aria-labelledby="weight-tables-heading">
      <h2 id="weight-tables-heading" className={styles.heading}>
        {/* On a phone the cards have no header row: the heading carries the term's tooltip instead. */}
        {phone ? (
          <Term tooltip={TERM_TOOLTIPS['Substat Weight Table']}>Substat Weight Tables</Term>
        ) : (
          'Substat Weight Tables'
        )}
      </h2>
      {rows.length > 0 &&
        (!phone ? (
          <div className={styles.scroller}>
            <table ref={setRowsElement} className={styles.table}>
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
                  <th scope="col" className={styles.figureHeader}>
                    <Term tooltip={TERM_TOOLTIPS['Target Score']}>
                      <TwoLines first="Target" second="Score" />
                    </Term>
                  </th>
                  <th scope="col" className={styles.figureHeader}>
                    <Term tooltip={TERM_TOOLTIPS['ER Target Score']}>
                      <TwoLines first="ER Target" second="Score" />
                    </Term>
                  </th>
                  <th scope="col" className={styles.figureHeader}>
                    <Term tooltip={TERM_TOOLTIPS['Echo Score']}>
                      <TwoLines first="Echo" second="Score" />
                    </Term>
                  </th>
                  <th scope="col" className={styles.figureHeader}>
                    <Term tooltip={TERM_TOOLTIPS['Target Chance']}>
                      <TwoLines first="Target" second="Chance" />
                    </Term>
                  </th>
                  <th scope="col" className={styles.figureHeader}>
                    <Term tooltip={TERM_TOOLTIPS['ER Target Chance']}>
                      <TwoLines first="ER Target" second="Chance" />
                    </Term>
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
                  <Row key={index} {...rowProps(row, index)} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul ref={setRowsElement} className={styles.cards} aria-labelledby="weight-tables-heading">
            {rows.map((row, index) => (
              <Card key={index} {...rowProps(row, index)} />
            ))}
          </ul>
        ))}
      <select
        ref={addRef}
        className={styles.add}
        aria-label="Add a Weight Table"
        value=""
        onChange={(event) => {
          if (event.target.value === NEW_TABLE) {
            dialogOpenedFrom.current = null;
            onNewTable();
          } else onAdd(event.target.value);
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

/** A column header on two even lines, as the prototype has them; it reads as one phrase. */
const TwoLines = ({ first, second }: { first: string; second: string }) => (
  <>
    <span className={styles.line}>{first}</span> <span className={styles.line}>{second}</span>
  </>
);

// Clicking a row's controls never changes focus; clicking anywhere else in the row does.
const isControl = (target: EventTarget) =>
  target instanceof Element && target.closest('button, input, select, a, label') !== null;

interface RowProps {
  row: ListedRow;
  isFocused: boolean;
  isCustom: boolean;
  options: ReactNode;
  onFocus(): void;
  onSwap(name: string): void;
  onRemove(): void;
  onTargetsChange(targets: TargetTexts): void;
  onOpenWeights(): void;
}

/** What a row and a card share: its targets' validity, its fade, and how it is put in focus. */
function useRow({ row, isFocused, onFocus }: RowProps) {
  const { state = 'done' } = row;
  return {
    faded: fadedWhen(state !== 'done'),
    state,
    errorId: useId(),
    targetInvalid: parseNonNegativeNumber(row.targetText).invalid,
    erTargetInvalid: parseNonNegativeNumber(row.erTargetText).invalid,
    /** The row's own focus: a tab stop before its controls; a click outside them, Enter or Space puts it in focus. */
    focusProps: {
      tabIndex: 0,
      'aria-current': isFocused ? ('true' as const) : undefined,
      onClick(event: MouseEvent) {
        if (!isControl(event.target)) onFocus();
      },
      onKeyDown(event: KeyboardEvent) {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocus();
        }
      },
    },
  };
}

function Row(props: RowProps) {
  const { row, isFocused, isCustom, options, onSwap, onRemove, onTargetsChange, onOpenWeights } =
    props;
  const { name, result } = row;
  const { faded, state, errorId, targetInvalid, erTargetInvalid, focusProps } = useRow(props);

  return (
    <tr className={isFocused ? styles.focused : undefined} {...focusProps}>
      <td>
        <div className={styles.nameCell}>
          <FittedSelect
            shown={name}
            fitClassName={styles.pickerFit}
            title={name}
            aria-label={`Swap ${name} for another Weight Table`}
            value={name}
            onChange={(event) => onSwap(event.target.value)}
          >
            {options}
          </FittedSelect>
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
      <td className={`${styles.figure} ${faded ?? ''}`}>
        {result ? formatEchoScore(result.echoScore) : NONE}
      </td>
      <td className={`${styles.figure} ${faded ?? ''}`}>
        <Chance result={result} chance={(r) => r.targetChance} verdict={(r) => r.reachesTarget} />
      </td>
      <td className={`${styles.figure} ${styles.statusCell}`}>
        <span className={faded}>
          <Chance
            result={result}
            chance={(r) => r.erTargetChance}
            verdict={(r) => r.reachesErTarget}
          />
        </span>
        {/* The row's line kept free under its results, running back across them from the right. */}
        <span className={styles.status}>
          <CalculationStatus state={state} inline />
        </span>
      </td>
      <td className={styles.icon}>
        <IconButton
          label={`Weights of ${name}`}
          icon={<SlidersIcon />}
          className={styles.iconButton}
          data-weights=""
          onClick={onOpenWeights}
        />
      </td>
      <td className={styles.icon}>
        <IconButton
          label={`Remove ${name}`}
          icon={<CrossIcon />}
          danger
          className={styles.iconButton}
          data-remove=""
          onClick={onRemove}
        />
      </td>
    </tr>
  );
}

/**
 * A table's card on a phone (spec §14): line 1 its picker, Custom tag, sliders and ×; line 2 its targets, labelled
 * above; line 3 its Echo Score and chances. The sliders and × come after the targets, so the tab order is a row's.
 */
function Card(props: RowProps) {
  const { row, isFocused, isCustom, options, onSwap, onRemove, onTargetsChange, onOpenWeights } =
    props;
  const { name, result } = row;
  const { faded, state, errorId, targetInvalid, erTargetInvalid, focusProps } = useRow(props);

  return (
    <li
      className={[styles.card, isFocused && styles.focusedCard].filter(Boolean).join(' ')}
      {...focusProps}
    >
      <div className={styles.cardName}>
        <FittedSelect
          shown={name}
          fitClassName={styles.cardPicker}
          title={name}
          aria-label={`Swap ${name} for another Weight Table`}
          value={name}
          onChange={(event) => onSwap(event.target.value)}
        >
          {options}
        </FittedSelect>
        {isCustom && <CustomTag />}
      </div>
      <div className={styles.cardTargets}>
        <label className={styles.cardField}>
          Target Score
          <TargetInput
            label={`Target Score for ${name}`}
            text={row.targetText}
            invalid={targetInvalid}
            errorId={errorId}
            onChange={(targetText) =>
              onTargetsChange({ targetText, erTargetText: row.erTargetText })
            }
          />
        </label>
        <label className={styles.cardField}>
          ER Target Score
          <TargetInput
            label={`ER Target Score for ${name}`}
            text={row.erTargetText}
            invalid={erTargetInvalid}
            errorId={errorId}
            onChange={(erTargetText) =>
              onTargetsChange({ targetText: row.targetText, erTargetText })
            }
          />
        </label>
      </div>
      {/* The line every card keeps free for its target error and, from the right, its calculation status. */}
      <div className={styles.cardStatusLine}>
        <span id={errorId} className={styles.cardError}>
          {targetInvalid || erTargetInvalid ? INVALID_NUMBER_MESSAGE : ''}
        </span>
        <span className={styles.cardStatus}>
          <CalculationStatus state={state} inline />
        </span>
      </div>
      <div className={`${styles.cardFigures} ${faded ?? ''}`}>
        <CardFigure label="Echo Score" table={name}>
          {result ? formatEchoScore(result.echoScore) : NONE}
        </CardFigure>
        <CardFigure label="Target Chance" table={name}>
          <Chance result={result} chance={(r) => r.targetChance} verdict={(r) => r.reachesTarget} />
        </CardFigure>
        <CardFigure label="ER Target Chance" table={name}>
          <Chance
            result={result}
            chance={(r) => r.erTargetChance}
            verdict={(r) => r.reachesErTarget}
          />
        </CardFigure>
      </div>
      <div className={styles.cardIcons}>
        <IconButton
          label={`Weights of ${name}`}
          icon={<SlidersIcon />}
          className={styles.iconButton}
          data-weights=""
          onClick={onOpenWeights}
        />
        <IconButton
          label={`Remove ${name}`}
          icon={<CrossIcon />}
          danger
          className={styles.iconButton}
          data-remove=""
          onClick={onRemove}
        />
      </div>
    </li>
  );
}

/** One of a card's figures, under its label; named for its table, as the target boxes are, apart from the boxes'. */
function CardFigure({
  label,
  table,
  children,
}: {
  label: string;
  table: string;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={`${label} for ${table}`} className={styles.cardFigure}>
      <span className={styles.cardFigureLabel} aria-hidden="true">
        {label}
      </span>
      <span className={styles.cardFigureValue}>{children}</span>
    </div>
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
