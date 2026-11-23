import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { findTable, MAX_TABLE_NAME_LENGTH, type WeightTableData } from '../catalogue/catalogue';
import type { SubstatType } from '../core/gameData';
import {
  blankDraft,
  checkDraft,
  copyDraft,
  editDraft,
  type TableDraft,
} from '../customTables/tableDraft';
import { SUBSTAT_DISPLAY_ORDER, SUBSTAT_NAMES } from './substats';
import { Modal } from '../ui/Modal';
import { CustomTag } from './TableOptions';
import styles from './WeightsDialog.module.css';

/** What the dialog opens on: a table's weights, or a draft of a new blank table. */
export type WeightsDialogStart =
  { readonly kind: 'view'; readonly name: string } | { readonly kind: 'new' };

export interface WeightsDialogProps {
  start: WeightsDialogStart;
  customTables: readonly WeightTableData[];
  builtInTables: readonly WeightTableData[];
  /** Saves a draft: a new table when `editing` is null, else the Custom table of that name, maybe renamed. */
  onSave(editing: string | null, table: WeightTableData): void;
  onDelete(name: string): void;
  onClose(): void;
}

type Screen =
  | { readonly kind: 'view'; readonly name: string }
  | {
      readonly kind: 'draft';
      readonly draft: TableDraft;
      /** The draft as it opened, to tell unsaved edits. */
      readonly opened: TableDraft;
      /** The Custom table being edited, or null for a new one. */
      readonly editing: string | null;
      /** The table Cancel goes back to, or null to close. */
      readonly back: string | null;
      /** The weights' order, fixed as the draft opens so rows don't move while typing. */
      readonly order: readonly SubstatType[];
    }
  | { readonly kind: 'confirmDelete'; readonly name: string };

const sameDraft = (a: TableDraft, b: TableDraft) =>
  a.name === b.name && SUBSTAT_DISPLAY_ORDER.every((type) => a.weights[type] === b.weights[type]);

/**
 * The one weights dialog (spec §5): a table's weights read-only, and the draft editor for Custom tables. A native modal
 * `<dialog>` (a bottom sheet on a phone); Escape, or a click outside it, closes it and gives focus back to its opener (also while asking to delete,
 * deleting nothing), or acts as Cancel while a draft has unsaved edits.
 */
export function WeightsDialog({
  start,
  customTables,
  builtInTables,
  onSave,
  onDelete,
  onClose,
}: WeightsDialogProps) {
  const allTables = [...customTables, ...builtInTables];
  const allNames = allTables.map((table) => table.name);
  const [screen, setScreen] = useState<Screen>(() => {
    if (start.kind === 'view') return start;
    const draft = blankDraft(allNames);
    return {
      kind: 'draft',
      draft,
      opened: draft,
      editing: null,
      back: null,
      order: SUBSTAT_DISPLAY_ORDER,
    };
  });

  // The table shown, or the one a draft edits, can vanish: a Custom table deleted in another tab (spec §12). The dialog
  // then closes silently, as on Close, discarding a draft's unsaved edits.
  const viewed = screen.kind === 'draft' ? undefined : findTable(allTables, screen.name);
  const vanished =
    screen.kind === 'draft'
      ? screen.editing !== null && !findTable(customTables, screen.editing)
      : !viewed;
  useEffect(() => {
    if (vanished) onClose();
  }, [vanished, onClose]);

  const headingId = useId();
  const isCustom = (name: string) => customTables.some((table) => table.name === name);

  /** Opens a draft from the `viewed` table, which Cancel goes back to, its weights in the order the view showed them. */
  function openDraft(draft: TableDraft, editing: string | null, viewed: WeightTableData) {
    setScreen({
      kind: 'draft',
      draft,
      opened: draft,
      editing,
      back: viewed.name,
      order: heaviestFirst(viewed.weights),
    });
  }

  function cancelDraft(back: string | null) {
    if (back === null) onClose();
    else setScreen({ kind: 'view', name: back });
  }

  function escape() {
    if (screen.kind === 'draft' && !sameDraft(screen.draft, screen.opened))
      cancelDraft(screen.back);
    else onClose();
  }

  let title: string;
  let body: ReactNode;
  if (screen.kind === 'draft') {
    if (vanished) return null;
    const checked = checkDraft(screen.draft, allNames, screen.editing);
    title = screen.editing === null ? 'New Custom Weight Table' : `Edit ${screen.editing}`;
    body = (
      <DraftEditor
        draft={screen.draft}
        order={screen.order}
        nameError={checked.nameError}
        weightErrors={checked.weightErrors}
        canSave={checked.table !== null}
        onChange={(draft) => setScreen({ ...screen, draft })}
        onSave={() => {
          if (!checked.table) return;
          onSave(screen.editing, checked.table);
          setScreen({ kind: 'view', name: checked.table.name });
        }}
        onCancel={() => cancelDraft(screen.back)}
      />
    );
  } else {
    const table = viewed;
    if (!table) return null; // vanished
    title = table.name;
    const custom = isCustom(table.name);
    body =
      screen.kind === 'confirmDelete' ? (
        <>
          <p className={styles.message}>
            Delete &apos;{table.name}&apos;? This can&apos;t be undone.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={() => setScreen({ kind: 'view', name: table.name })}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.dangerPrimary}`}
              onClick={() => onDelete(table.name)}
            >
              Delete
            </button>
          </div>
        </>
      ) : (
        <>
          {!custom && (
            <p className={styles.message}>
              Built-in tables can&apos;t be changed. Duplicate it to make your own.
            </p>
          )}
          <WeightsView weights={table.weights} />
          <div className={styles.actions}>
            {custom && (
              <>
                <button
                  type="button"
                  className={`${styles.button} ${styles.danger}`}
                  onClick={() => setScreen({ kind: 'confirmDelete', name: table.name })}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => openDraft(editDraft(table), table.name, table)}
                >
                  Edit
                </button>
              </>
            )}
            <button
              type="button"
              className={styles.button}
              onClick={() => openDraft(copyDraft(table, allNames), null, table)}
            >
              Duplicate
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </>
      );
  }

  // Drafts carry no tag: "Edit X" and "New Custom Weight Table" (ticket 07's prototype).
  const tagged = screen.kind !== 'draft' && isCustom(screen.name);
  return (
    <Modal labelledBy={headingId} onDismiss={escape}>
      <h2 id={headingId} className={styles.title}>
        <span className={styles.titleText}>{title}</span>
        {tagged && <CustomTag />}
      </h2>
      {body}
    </Modal>
  );
}

const weightOf = (weights: WeightTableData['weights'], type: SubstatType) => weights[type] ?? 0;

/** Substat types heaviest first, ties in the usual order. */
function heaviestFirst(weights: WeightTableData['weights']): readonly SubstatType[] {
  return [...SUBSTAT_DISPLAY_ORDER].sort((a, b) => weightOf(weights, b) - weightOf(weights, a));
}

/** A table's weights read-only: one column, heaviest first, each with a bar scaled to the heaviest; zeros muted, barless. */
function WeightsView({ weights }: { weights: WeightTableData['weights'] }) {
  const heaviest = Math.max(...SUBSTAT_DISPLAY_ORDER.map((type) => weightOf(weights, type)));
  return (
    <dl className={styles.weights}>
      {heaviestFirst(weights).map((type) => {
        const weight = weightOf(weights, type);
        return (
          <div
            key={type}
            className={weight ? styles.weightRow : `${styles.weightRow} ${styles.zero}`}
            data-zero={weight ? undefined : ''}
          >
            <dt>{SUBSTAT_NAMES[type]}</dt>
            <dd className={styles.weightValue}>
              <span className={styles.weightNumber}>{weight}</span>
              {weight > 0 ? (
                <span className={styles.bar} aria-hidden="true" data-bar="">
                  <span
                    className={styles.barFill}
                    style={{ width: `${(weight / heaviest) * 100}%` }}
                  />
                </span>
              ) : (
                <span />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function DraftEditor({
  draft,
  order,
  nameError,
  weightErrors,
  canSave,
  onChange,
  onSave,
  onCancel,
}: {
  draft: TableDraft;
  order: readonly SubstatType[];
  nameError: string | null;
  weightErrors: Readonly<Partial<Record<SubstatType, string>>>;
  canSave: boolean;
  onChange(draft: TableDraft): void;
  onSave(): void;
  onCancel(): void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  // The name field is ready to edit straight away.
  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <Field label="Name" error={nameError} wide>
        {(props) => (
          <input
            {...props}
            ref={nameRef}
            type="text"
            autoComplete="off"
            maxLength={MAX_TABLE_NAME_LENGTH}
            className={styles.nameInput}
            value={draft.name}
            onChange={(event) =>
              onChange({ ...draft, name: event.target.value.slice(0, MAX_TABLE_NAME_LENGTH) })
            }
          />
        )}
      </Field>
      <div className={styles.weightFields}>
        {order.map((type) => (
          <Field key={type} label={SUBSTAT_NAMES[type]} error={weightErrors[type] ?? null}>
            {(props) => (
              <input
                {...props}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className={styles.numberInput}
                value={draft.weights[type]}
                onChange={(event) =>
                  onChange({ ...draft, weights: { ...draft.weights, [type]: event.target.value } })
                }
              />
            )}
          </Field>
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!canSave}>
          Save
        </button>
      </div>
    </form>
  );
}

interface FieldInputProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

/** A labelled field with its problem shown beneath it. */
function Field({
  label,
  error,
  wide,
  children,
}: {
  label: string;
  error: string | null;
  wide?: boolean;
  children(props: FieldInputProps): ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={wide ? `${styles.field} ${styles.wide}` : styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
      })}
      <span id={errorId} className={styles.error}>
        {error ?? ''}
      </span>
    </div>
  );
}
