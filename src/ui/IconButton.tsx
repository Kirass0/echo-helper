import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'title' | 'children'
> {
  /** The accessible label, also shown as the tooltip. */
  label: string;
  icon: ReactNode;
  /** Turns red on hover, for removing things. */
  danger?: boolean;
}

/** A muted, thin-stroke icon button with an accessible label, a tooltip and a ≥24×24px hit area. */
export function IconButton({ label, icon, danger, className, ...rest }: IconButtonProps) {
  const classes = [styles.button, danger && styles.danger, className].filter(Boolean).join(' ');
  return (
    <button type="button" aria-label={label} title={label} className={classes} {...rest}>
      {icon}
    </button>
  );
}
