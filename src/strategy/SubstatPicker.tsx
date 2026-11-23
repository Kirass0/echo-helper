import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import type { SubstatType } from '../core/gameData';
import { SUBSTAT_DISPLAY_ORDER, SUBSTAT_NAMES } from '../evaluation/substats';
import dialogStyles from '../evaluation/WeightsDialog.module.css';
import { Modal } from '../ui/Modal';
import { usePhoneLayout } from '../ui/usePhoneLayout';
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
 * focus back to the button (spec §15). A click anywhere on a row toggles its Substat; a click elsewhere inside the
 * popover keeps it open. The button may move as the picks change its text, but the popover stays where it opened.
 * On a phone it is a bottom sheet instead, one checkbox per line with Done (spec §14).
 */
export function SubstatPicker({ picked, onChange, describedBy }: SubstatPickerProps) {
  const [open, setOpen] = useState(false);
  const phone = usePhoneLayout();
  const sheetTitleId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  /** Where the popover opened, in its positioned ancestor's coordinates, so it can stay there. */
  const openedAt = useRef<{ left: number; top: number } | null>(null);
  const [popoverPlace, setPopoverPlace] = useState<CSSProperties | undefined>(undefined);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!open || !wrapper) {
      openedAt.current = null;
      setPopoverPlace(undefined);
      return;
    }
    openedAt.current ??= {
      left: wrapper.offsetLeft,
      top: wrapper.offsetTop + wrapper.offsetHeight,
    };
    const { left, top } = openedAt.current;
    setPopoverPlace({
      left: left - wrapper.offsetLeft,
      top: `calc(${top - wrapper.offsetTop}px + 4px)`,
    });
  }, [open, picked]);

  useEffect(() => {
    if (!open || phone) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open, phone]);

  function handleBlur(event: FocusEvent) {
    if (phone) return;
    if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open || phone) return;
    event.stopPropagation();
    setOpen(false);
    openerRef.current?.focus();
  }

  const toggle = (type: SubstatType, on: boolean) =>
    onChange(SUBSTAT_DISPLAY_ORDER.filter((t) => (t === type ? on : picked.includes(t))));

  const summary = SUBSTAT_DISPLAY_ORDER.filter((type) => picked.includes(type))
    .map((type) => SUBSTAT_NAMES[type])
    .join(', ');

  const options = SUBSTAT_DISPLAY_ORDER.map((type) => (
    <label key={type} className={styles.option}>
      <input
        type="checkbox"
        checked={picked.includes(type)}
        onChange={(event) => toggle(type, event.target.checked)}
      />
      {SUBSTAT_NAMES[type]}
    </label>
  ));

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
      {open && phone && (
        <Modal labelledBy={sheetTitleId} onDismiss={() => setOpen(false)}>
          <h2 id={sheetTitleId} className={dialogStyles.title}>
            Substats
          </h2>
          <div className={styles.sheetOptions}>{options}</div>
          <div className={dialogStyles.actions}>
            <button
              type="button"
              className={`${dialogStyles.button} ${dialogStyles.primary}`}
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </Modal>
      )}
      {open && !phone && (
        <span
          role="group"
          aria-label="Substats"
          className={styles.popover}
          style={popoverPlace}
          // Focusable so a click on a row's text or the popover's padding keeps focus inside it.
          tabIndex={-1}
        >
          {options}
        </span>
      )}
    </span>
  );
}
