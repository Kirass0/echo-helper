import { useId } from 'react';
import buttons from './buttons.module.css';
import styles from './dialog.module.css';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  /** The question, which also names the dialog. */
  message: string;
  /** The confirming button's text, e.g. "Replace". */
  confirm: string;
  /** Whether confirming destroys something: its button is then filled red, not in the accent. */
  danger?: boolean;
  onConfirm(): void;
  /** Cancel, Escape or a click outside. */
  onCancel(): void;
}

/**
 * A modal `<dialog>` (a bottom sheet on a phone) asking one question, with Cancel and a confirming button. Escape or a
 * click outside cancels; focus goes back to the opener on closing.
 */
export function ConfirmDialog({
  message,
  confirm,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const messageId = useId();
  return (
    <Modal labelledBy={messageId} onDismiss={onCancel}>
      <p id={messageId} className={styles.message}>
        {message}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={`${styles.button} ${danger ? buttons.dangerPrimary : styles.primary}`}
          onClick={onConfirm}
        >
          {confirm}
        </button>
      </div>
    </Modal>
  );
}
