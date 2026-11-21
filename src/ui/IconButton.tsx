import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';
import { useTooltip } from './Tooltip';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'aria-label'
  | 'title'
  | 'children'
  | 'onFocus'
  | 'onBlur'
  | 'onPointerEnter'
  | 'onPointerLeave'
  | 'aria-describedby'
  | 'ref'
> {
  /** The accessible label, also shown as the tooltip. */
  label: string;
  icon: ReactNode;
  /** Turns red on hover, for removing things. */
  danger?: boolean;
}

/**
 * A muted, thin-stroke icon button with an accessible label and a ≥24×24px hit area. Its label shows as a tooltip on
 * hover and on keyboard focus.
 */
export function IconButton({ label, icon, danger, className, ...rest }: IconButtonProps) {
  const { triggerProps, tooltip } = useTooltip({ text: label, describes: false, openOnTap: false });
  const classes = [styles.button, danger && styles.danger, className].filter(Boolean).join(' ');
  return (
    <>
      <button
        type="button"
        aria-label={label}
        className={classes}
        {...rest}
        {...triggerProps}
        onClick={rest.onClick}
      >
        {icon}
      </button>
      {tooltip}
    </>
  );
}
