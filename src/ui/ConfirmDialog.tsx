import { useId } from 'react';
// The weights dialog's text and buttons, so both dialogs look alike (spec §13).
import styles from '../evaluation/WeightsDialog.module.css';
import { Modal } from './Modal';

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
 * A modal `<dialog>` (a bottom sheet on a phone) asking one question, with Cancel and a confirming button. Escape or a
 * click outside cancels; focus goes back to the opener on closing.
 */
export function ConfirmDialog({ message, confirm, onConfirm, onCancel }: ConfirmDialogProps) {
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
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </Modal>
  );
}
