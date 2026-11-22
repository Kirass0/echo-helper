import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import type { SubstatType } from '../core/gameData';
import { SUBSTAT_DISPLAY_ORDER, SUBSTAT_NAMES } from '../evaluation/substats';
import styles from './StageEditor.module.css';

export interface SubstatPickerProps {
  picked: readonly SubstatType[];
  onChange(picked: readonly SubstatType[]): void;
  /** Set while the rule is unfinished for want of a Substat: its message. */
  describedBy?: string | undefined;
}

/**
 * A Substat Count rule's Substats: a button reading the picks ("pick Substats" while there are none) that opens a
 * popover of checkboxes. The popover closes on a click outside it, when focus leaves it, or on Escape, which gives
 * focus back to the button (spec §15).
 */
export function SubstatPicker({ picked, onChange, describedBy }: SubstatPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  function handleBlur(event: FocusEvent) {
    if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open) return;
    event.stopPropagation();
    setOpen(false);
    openerRef.current?.focus();
  }

  const toggle = (type: SubstatType, on: boolean) =>
    onChange(SUBSTAT_DISPLAY_ORDER.filter((t) => (t === type ? on : picked.includes(t))));

  const summary = SUBSTAT_DISPLAY_ORDER.filter((type) => picked.includes(type))
    .map((type) => SUBSTAT_NAMES[type])
    .join(', ');

  return (
    <span ref={wrapperRef} className={styles.picker} onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <button
        ref={openerRef}
        type="button"
        className={`${styles.pick} ${summary ? '' : styles.pickEmpty}`}
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => setOpen((was) => !was)}
      >
        {summary || 'pick Substats'}
      </button>
      {open && (
        <span role="group" aria-label="Substats" className={styles.popover}>
          {SUBSTAT_DISPLAY_ORDER.map((type) => (
            <label key={type} className={styles.option}>
              <input
                type="checkbox"
                checked={picked.includes(type)}
                onChange={(event) => toggle(type, event.target.checked)}
              />
              {SUBSTAT_NAMES[type]}
            </label>
          ))}
        </span>
      )}
    </span>
  );
}
