import { useId } from 'react';
import type { WeightTableData } from '../catalogue/catalogue';
import { INVALID_TARGET_MESSAGE, parseTarget } from './targetScore';
import styles from './WeightTableList.module.css';

/** A listed table and what is typed in its target boxes. */
export interface ListedTable {
  readonly name: string;
  readonly targetText: string;
  readonly erTargetText: string;
}

export interface WeightTableListProps {
  builtInTables: readonly WeightTableData[];
  listed: ListedTable | null;
  onAdd(name: string): void;
  onTargetsChange(targets: { targetText: string; erTargetText: string }): void;
}

/** The "Substat Weight Tables" list: the only place tables are picked on Echo Evaluation. */
export function WeightTableList({
  builtInTables,
  listed,
  onAdd,
  onTargetsChange,
}: WeightTableListProps) {
  return (
    <section className={styles.list} aria-labelledby="weight-tables-heading">
      <h2 id="weight-tables-heading" className={styles.heading}>
        Substat Weight Tables
      </h2>
      {listed && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Weight Table</th>
              <th scope="col">Target Score</th>
              <th scope="col">ER Target Score</th>
            </tr>
          </thead>
          <tbody>
            <tr className={styles.focused}>
              <td className={styles.name}>{listed.name}</td>
              <td>
                <TargetInput
                  label={`Target Score for ${listed.name}`}
                  text={listed.targetText}
                  onChange={(targetText) => onTargetsChange({ ...listed, targetText })}
                />
              </td>
              <td>
                <TargetInput
                  label={`ER Target Score for ${listed.name}`}
                  text={listed.erTargetText}
                  onChange={(erTargetText) => onTargetsChange({ ...listed, erTargetText })}
                />
              </td>
            </tr>
          </tbody>
        </table>
      )}
      {!listed && (
        <select
          className={styles.add}
          aria-label="Add a Weight Table"
          value=""
          onChange={(event) => onAdd(event.target.value)}
        >
          <option value="" disabled>
            Choose a Weight Table…
          </option>
          {[...builtInTables]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((table) => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
        </select>
      )}
    </section>
  );
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
