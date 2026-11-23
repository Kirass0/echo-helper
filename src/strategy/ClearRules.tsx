import { useLayoutEffect, useRef, useState } from 'react';
import type { StrategyName } from '../calculation/protocol';
import buttons from '../ui/buttons.module.css';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { hasRules, type StrategyDraft } from './strategyDraft';

export interface ClearRulesProps {
  /** The strategy it would clear. */
  draft: StrategyDraft;
  /** Strategy A or B while comparing; none for the one strategy. */
  name?: StrategyName;
  onClear(): void;
  /** Where focus goes once cleared, as Clear all rules itself is then disabled. */
  focusAfter(): HTMLElement | null | undefined;
}

/**
 * "Clear all rules": removes every Rule Group at every Tune Stage, once asked with Clear and Cancel. It is disabled
 * while the strategy has no rules. In compare mode, each strategy has its own.
 */
export function ClearRules({ draft, name, onClear, focusAfter }: ClearRulesProps) {
  const [asking, setAsking] = useState(false);
  const refocus = useRef(false);
  const label = name ? `Strategy ${name}` : 'your strategy';

  // After the dialog has closed and handed focus back to this, now disabled, button.
  useLayoutEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    focusAfter()?.focus();
  });

  return (
    <>
      <button
        type="button"
        className={`${buttons.button} ${buttons.danger}`}
        aria-label={`Clear all rules from ${label}`}
        disabled={!hasRules(draft)}
        onClick={() => setAsking(true)}
      >
        Clear all rules
      </button>
      {asking && (
        <ConfirmDialog
          message={`Clear all rules from ${label}? This can't be undone.`}
          confirm="Clear"
          danger
          onConfirm={() => {
            setAsking(false);
            refocus.current = true;
            onClear();
          }}
          onCancel={() => setAsking(false)}
        />
      )}
    </>
  );
}
