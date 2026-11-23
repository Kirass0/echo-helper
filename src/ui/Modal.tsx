import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from './Modal.module.css';

export interface ModalProps {
  /** The id of the element naming it: its title, or its question. */
  labelledBy: string;
  /** Escape, or a tap on the dimmed area outside. */
  onDismiss(): void;
  children: ReactNode;
}

/**
 * Every popup's frame (spec §14, §15): a native `<dialog>` opened with `showModal()`, a centred dialog on desktop and a
 * bottom sheet on a phone, with a grab handle, at most 85% of the height and scrolling inside. Escape, or a press and
 * release both on the dimmed area, calls `onDismiss`; focus goes back to the opener when it unmounts.
 */
export function Modal({ labelledBy, onDismiss, children }: ModalProps) {
  // Focus goes back to the opener on closing, so note it before anything in the dialog takes focus.
  const [opener] = useState(() => document.activeElement);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      // Closed first: while the modal is open, the page behind it is inert and can't take focus.
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [opener]);

  return (
    // The content fills the whole <dialog>, so a click lands on the <dialog> itself only on the dimmed area outside.
    // Both press and release must be outside, so a drag that starts in a field and ends outside closes nothing.
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onPointerDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget) onDismiss();
        pressedOutside.current = false;
      }}
    >
      <div className={styles.content}>
        <span className={styles.grab} aria-hidden="true" />
        {children}
      </div>
    </dialog>
  );
}
