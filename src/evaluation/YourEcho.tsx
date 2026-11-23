import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { SubstatEntry } from '../calculation/protocol';
import { MAX_TUNE_STAGE, possibleRolls, type SubstatType } from '../core/gameData';
import buttons from '../ui/buttons.module.css';
import { IconButton } from '../ui/IconButton';
import { CrossIcon, PencilIcon } from '../ui/icons';
import { formatSubstatValue } from './format';
import { SUBSTAT_DISPLAY_ORDER, SUBSTAT_NAMES } from './substats';
import styles from './YourEcho.module.css';

export interface YourEchoProps {
  /** The Substats in slot order. */
  substats: readonly SubstatEntry[];
  onChange(substats: SubstatEntry[]): void;
}

/** Picking for one slot: first its type, then that type's value. */
interface Picking {
  slot: number;
  type: SubstatType | null;
}

const levelOf = (slot: number) => (slot + 1) * 5;

// Where focus goes after a slot action, as `data-focus` keys inside this component (spec §15).
const ADD = 'add';
const pencilOf = (slot: number) => `pencil-${slot}`;
const typeKey = (type: SubstatType) => `type-${type}`;
const FIRST_VALUE = 'value-first';

/** "Your Echo": five tune slots, filled one by one with the Substats tuning revealed. */
export function YourEcho({ substats, onChange }: YourEchoProps) {
  const [picking, setPicking] = useState<Picking | null>(null);
  const container = useRef<HTMLElement>(null);
  const focusNext = useRef<string | null>(null);
  const tuneStage = substats.length;

  useLayoutEffect(() => {
    if (focusNext.current === null) return;
    container.current?.querySelector<HTMLElement>(`[data-focus="${focusNext.current}"]`)?.focus();
    focusNext.current = null;
  });

  const openerOf = (slot: number) => (slot < tuneStage ? pencilOf(slot) : ADD);

  function open(slot: number) {
    setPicking({ slot, type: null });
    const first = substats[slot]?.type ?? freeTypes(slot)[0];
    focusNext.current = first ? typeKey(first) : null;
  }

  function close(slot: number) {
    setPicking(null);
    focusNext.current = openerOf(slot);
  }

  function pickType(slot: number, type: SubstatType) {
    setPicking({ slot, type });
    focusNext.current = FIRST_VALUE;
  }

  function back(slot: number, type: SubstatType) {
    setPicking({ slot, type: null });
    focusNext.current = typeKey(type);
  }

  function pickValue(slot: number, type: SubstatType, value: number) {
    const next = [...substats];
    next[slot] = { type, value };
    onChange(next);
    setPicking(null);
    focusNext.current = next.length < MAX_TUNE_STAGE ? ADD : pencilOf(slot);
  }

  /** Every Substat at once, back to Tune Stage 0/5; an open picker closes. */
  function clear() {
    onChange([]);
    setPicking(null);
    focusNext.current = ADD;
  }

  function remove(slot: number) {
    onChange(substats.filter((_, i) => i !== slot));
    if (picking !== null) setPicking(null);
    focusNext.current = ADD;
  }

  // The types not already on the Echo; a slot being changed may keep its own.
  function freeTypes(slot: number): SubstatType[] {
    const taken = new Set(substats.filter((_, i) => i !== slot).map((substat) => substat.type));
    return SUBSTAT_DISPLAY_ORDER.filter((type) => !taken.has(type));
  }

  function onPickerKeyDown(event: KeyboardEvent, slot: number) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close(slot);
  }

  function slotContent(slot: number) {
    const level = levelOf(slot);
    const substat = substats[slot];

    if (picking?.slot === slot) {
      const current = substat;
      const chosen = picking.type;
      return (
        <div className={styles.picker} onKeyDown={(event) => onPickerKeyDown(event, slot)}>
          {chosen === null ? (
            <div className={styles.typeGrid}>
              {freeTypes(slot).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={styles.choice}
                  data-focus={typeKey(type)}
                  aria-current={current?.type === type ? 'true' : undefined}
                  onClick={() => pickType(slot, type)}
                >
                  {SUBSTAT_NAMES[type]}
                </button>
              ))}
            </div>
          ) : (
            <ValueChoices
              type={chosen}
              current={current?.type === chosen ? current.value : null}
              onPick={(value) => pickValue(slot, chosen, value)}
            />
          )}
          <div className={styles.pickerActions}>
            {chosen !== null && (
              <button type="button" className={styles.link} onClick={() => back(slot, chosen)}>
                Back
              </button>
            )}
            <button type="button" className={styles.link} onClick={() => close(slot)}>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (substat) {
      const name = SUBSTAT_NAMES[substat.type];
      return (
        <div className={styles.filled}>
          <span className={styles.level}>+{level}</span>
          <span className={styles.name}>{name}</span>
          <span className={styles.value}>{formatSubstatValue(substat.type, substat.value)}</span>
          <span className={styles.icons}>
            <IconButton
              label={`Change the Substat at +${level}`}
              icon={<PencilIcon />}
              data-focus={pencilOf(slot)}
              onClick={() => open(slot)}
            />
            <IconButton
              label={`Remove ${name}`}
              icon={<CrossIcon />}
              danger
              onClick={() => remove(slot)}
            />
          </span>
        </div>
      );
    }

    if (slot === tuneStage) {
      return (
        <button type="button" className={styles.add} data-focus={ADD} onClick={() => open(slot)}>
          <span className={styles.level} aria-hidden="true">
            +{level}
          </span>
          <span className={styles.name}>Add the Substat revealed at +{level}</span>
        </button>
      );
    }

    return (
      <div className={styles.later}>
        <span className={styles.level}>+{level}</span>
        <span>not tuned yet</span>
      </div>
    );
  }

  return (
    <section className={styles.yourEcho} ref={container} aria-label="Your Echo">
      {/* On a narrow screen the Tune Stage wraps below "Your Echo", and Clear stays on the first row. */}
      <div className={styles.head}>
        <h2 className={styles.heading}>
          <span>Your Echo</span>{' '}
          <span className={styles.stage}>
            Tune Stage {tuneStage}/{MAX_TUNE_STAGE} (+{tuneStage * 5})
          </span>
        </h2>
        <button
          type="button"
          className={`${buttons.button} ${buttons.danger}`}
          aria-label="Clear Your Echo"
          disabled={tuneStage === 0}
          onClick={clear}
        >
          Clear
        </button>
      </div>
      <ol className={styles.slots} aria-label="Tune slots">
        {Array.from({ length: MAX_TUNE_STAGE }, (_, slot) => (
          <li
            key={slot}
            className={[
              styles.slot,
              picking?.slot === slot && styles.picking,
              !substats[slot] && picking?.slot !== slot && styles.open,
              slot === tuneStage && picking?.slot !== slot && styles.next,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {slotContent(slot)}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ValueChoices({
  type,
  current,
  onPick,
}: {
  type: SubstatType;
  current: number | null;
  onPick(value: number): void;
}) {
  return (
    <div className={styles.valueGrid}>
      {possibleRolls(type).map(({ value }, i) => (
        <button
          key={value}
          type="button"
          className={styles.choice}
          data-focus={i === 0 ? FIRST_VALUE : undefined}
          aria-current={current === value ? 'true' : undefined}
          onClick={() => onPick(value)}
        >
          {formatSubstatValue(type, value)}
        </button>
      ))}
    </div>
  );
}
