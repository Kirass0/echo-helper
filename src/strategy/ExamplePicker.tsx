import { useState } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FittedSelect } from '../ui/FittedSelect';
import { EXAMPLE_NAMES } from './examples';
import type { StrategyDraft } from './strategyDraft';
import styles from './UpgradeStrategy.module.css';

export interface ExamplePickerProps {
  /** The strategy an example would replace. */
  draft: StrategyDraft;
  disabled?: boolean;
  onLoad(name: string): void;
}

const hasRules = (draft: StrategyDraft) => draft.stages.some((boxes) => boxes.length > 0);

/**
 * "Start from an example" (spec §8, "Example strategies"). Replacing a strategy holding at least one rule first asks
 * with Replace and Cancel; an empty strategy is replaced without asking. In compare mode, each strategy has its own.
 */
export function ExamplePicker({ draft, disabled = false, onLoad }: ExamplePickerProps) {
  const [replacing, setReplacing] = useState<string | null>(null);
  return (
    <>
      <label className={styles.field}>
        Start from an example
        {/* As wide as "Choose…", which it always shows, as in the prototype. */}
        <FittedSelect
          shown="Choose…"
          fitClassName={styles.pickerFit}
          disabled={disabled}
          value=""
          onChange={(event) => {
            const name = event.target.value;
            if (!name) return;
            if (hasRules(draft)) setReplacing(name);
            else onLoad(name);
          }}
        >
          <option value="">Choose…</option>
          {EXAMPLE_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </FittedSelect>
      </label>
      {replacing !== null && (
        <ConfirmDialog
          message={`Replace your current strategy with '${replacing}'? This can't be undone.`}
          confirm="Replace"
          onConfirm={() => {
            setReplacing(null);
            onLoad(replacing);
          }}
          onCancel={() => setReplacing(null)}
        />
      )}
    </>
  );
}
