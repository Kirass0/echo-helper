import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { findTable, MAX_TABLE_NAME_LENGTH, type WeightTableData } from '../catalogue/catalogue';
import type { SubstatType } from '../core/gameData';
import { IconButton } from '../ui/IconButton';
import { CrossIcon } from '../ui/icons';
import {
  blankDraft,
  checkDraft,
  copyDraft,
  editDraft,
  type TableDraft,
} from '../customTables/tableDraft';
import { SUBSTAT_DISPLAY_ORDER, SUBSTAT_NAMES } from './substats';
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
    }
  | { readonly kind: 'confirmDelete'; readonly name: string };

const sameDraft = (a: TableDraft, b: TableDraft) =>
  a.name === b.name && SUBSTAT_DISPLAY_ORDER.every((type) => a.weights[type] === b.weights[type]);

/**
 * The one weights dialog (spec §5): a table's weights read-only, and the draft editor for Custom tables. A native modal
 * `<dialog>`; Escape closes it and gives focus back to its opener (also while asking to delete, deleting nothing), or
 * acts as Cancel while a draft has unsaved edits.
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
    return { kind: 'draft', draft, opened: draft, editing: null, back: null };
  });

  // Focus goes back to the opener on closing, so note it before anything in the dialog takes focus.
  const [opener] = useState(() => document.activeElement);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    dialogRef.current?.showModal();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [opener]);

  const headingId = useId();
  const isCustom = (name: string) => customTables.some((table) => table.name === name);

  function openDraft(draft: TableDraft, editing: string | null, back: string | null) {
    setScreen({ kind: 'draft', draft, opened: draft, editing, back });
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
    const checked = checkDraft(screen.draft, allNames, screen.editing);
    title = screen.editing ?? 'New Custom Weight Table';
    body = (
      <DraftEditor
        draft={screen.draft}
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
    const table = findTable(allTables, screen.name);
    if (!table) return null;
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
              className={`${styles.button} ${styles.danger}`}
              onClick={() => onDelete(table.name)}
            >
              Delete
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setScreen({ kind: 'view', name: table.name })}
            >
              Cancel
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
          <dl className={styles.weights}>
            {SUBSTAT_DISPLAY_ORDER.map((type) => (
              <div key={type} className={styles.weightRow}>
                <dt>{SUBSTAT_NAMES[type]}</dt>
                <dd className={styles.weightValue}>{table.weights[type] ?? 0}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.actions}>
            {custom && (
              <button
                type="button"
                className={styles.button}
                onClick={() => openDraft(editDraft(table), table.name, table.name)}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className={styles.button}
              onClick={() => openDraft(copyDraft(table, allNames), null, table.name)}
            >
              Duplicate
            </button>
            {custom && (
              <button
                type="button"
                className={`${styles.button} ${styles.danger}`}
                onClick={() => setScreen({ kind: 'confirmDelete', name: table.name })}
              >
                Delete
              </button>
            )}
          </div>
        </>
      );
  }

  const tagged = screen.kind !== 'draft' ? isCustom(screen.name) : screen.editing !== null;
  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        escape();
      }}
    >
      <h2 id={headingId} className={styles.title}>
        <span className={styles.titleText}>{title}</span>
        {tagged && <CustomTag />}
      </h2>
      {body}
      {/* Last in the tab order, so opening the dialog focuses its first real control; it sits top right. */}
      <IconButton className={styles.close} label="Close" icon={<CrossIcon />} onClick={onClose} />
    </dialog>
  );
}

function DraftEditor({
  draft,
  nameError,
  weightErrors,
  canSave,
  onChange,
  onSave,
  onCancel,
}: {
  draft: TableDraft;
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
        {SUBSTAT_DISPLAY_ORDER.map((type) => (
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
        <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!canSave}>
          Save
        </button>
        <button type="button" className={styles.button} onClick={onCancel}>
          Cancel
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
