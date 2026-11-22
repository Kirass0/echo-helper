import { useId, useLayoutEffect, useRef, useState } from 'react';
// The weights dialog's frame and buttons, so both dialogs look alike (spec §13).
import styles from '../evaluation/WeightsDialog.module.css';

export interface ConfirmDialogProps {
  /** The question, which also names the dialog. */
  message: string;
  /** The confirming button's text, e.g. "Replace". */
  confirm: string;
  onConfirm(): void;
  /** Cancel, Escape or a click outside. */
  onCancel(): void;
}

/**
 * A native modal `<dialog>` asking one question, with Cancel and a confirming button. Escape or a click outside
 * cancels; focus goes back to the opener on closing.
 */
export function ConfirmDialog({ message, confirm, onConfirm, onCancel }: ConfirmDialogProps) {
  const [opener] = useState(() => document.activeElement);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messageId = useId();
  const pressedOutside = useRef(false);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [opener]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onPointerDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget) onCancel();
        pressedOutside.current = false;
      }}
    >
      <div className={styles.content}>
        <p id={messageId} className={styles.message}>
          {message}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={onConfirm}
          >
            {confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}
