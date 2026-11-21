import type { WeightTableData } from '../catalogue/catalogue';
import styles from './TableOptions.module.css';

const alphabetical = (tables: readonly WeightTableData[]) =>
  [...tables].sort((a, b) => a.name.localeCompare(b.name));

/**
 * A table picker's options (spec §5): two labelled groups, "Custom" first (hidden while empty) then "Built-in", each
 * alphabetical.
 */
export function TableOptions({
  custom,
  builtIn,
}: {
  custom: readonly WeightTableData[];
  builtIn: readonly WeightTableData[];
}) {
  return (
    <>
      <Group label="Custom" tables={custom} />
      <Group label="Built-in" tables={builtIn} />
    </>
  );
}

function Group({ label, tables }: { label: string; tables: readonly WeightTableData[] }) {
  if (tables.length === 0) return null;
  return (
    <optgroup label={label}>
      {alphabetical(tables).map((table) => (
        <option key={table.name} value={table.name}>
          {table.name}
        </option>
      ))}
    </optgroup>
  );
}

/** The small "Custom" tag beside a Custom table's name outside a picker. */
export function CustomTag() {
  return <span className={styles.tag}>Custom</span>;
}
