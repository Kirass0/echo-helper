import {
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';

/** Why a tooltip is open. It stays open while any reason holds. */
type Reason = 'hover' | 'focus' | 'tap';

/** How long the pointer may be off both the trigger and the tooltip before it closes, to cross the gap. */
const HOVER_GRACE_MS = 120;
/** The gap between the trigger and the tooltip, and the least margin from the viewport edge. */
const GAP = 6;
const EDGE = 10;

export interface TooltipOptions {
  /** Plain text, no links. */
  text: string;
  /** Link the trigger to the tooltip with `aria-describedby`. Off when the text already is the trigger's label. */
  describes: boolean;
  /** Open on a tap or click, for terms. Icon buttons act on a click instead. */
  openOnTap: boolean;
}

/**
 * A plain-text tooltip for one trigger (spec §10, §15): opens on hover, keyboard focus and (optionally) tap, stays open
 * while the pointer is over the trigger or the tooltip, and closes on a tap elsewhere or Escape, which leaves focus
 * where it is. It sits below the trigger, or above if there's no room below.
 *
 * Returns the props to spread on the trigger and the tooltip element to render anywhere (it portals to the body, so
 * no overflow clips it and it adds nothing to the names of the trigger's ancestors).
 */
export function useTooltip({ text, describes, openOnTap }: TooltipOptions) {
  const id = useId();
  const [reasons, setReasons] = useState<ReadonlySet<Reason>>(new Set());
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const open = reasons.size > 0;

  const add = (reason: Reason) =>
    setReasons((current) => (current.has(reason) ? current : new Set(current).add(reason)));
  const drop = (reason: Reason) =>
    setReasons((current) => {
      if (!current.has(reason)) return current;
      const next = new Set(current);
      next.delete(reason);
      return next;
    });

  const enter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(leaveTimer.current);
    add('hover');
  };
  const leave = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => drop('hover'), HOVER_GRACE_MS);
  };
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // Escape and a tap elsewhere close it, whatever opened it.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      clearTimeout(leaveTimer.current);
      setReasons(new Set());
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // Below the trigger, or above if there's no room; kept inside the viewport sideways.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const tip = tooltipRef.current?.getBoundingClientRect();
      if (!trigger || !tip) return;
      const below = trigger.bottom + GAP;
      const above = trigger.top - GAP - tip.height;
      const fitsBelow = below + tip.height <= window.innerHeight - EDGE;
      const top = fitsBelow || above < EDGE ? below : above;
      const left = Math.max(EDGE, Math.min(trigger.left, window.innerWidth - EDGE - tip.width));
      setPlace({ left, top });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open]);

  const triggerProps = {
    ref: (element: HTMLElement | null) => {
      triggerRef.current = element;
    },
    'aria-describedby': describes ? id : undefined,
    onPointerEnter: enter,
    onPointerLeave: leave,
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (focusVisible(event.currentTarget)) add('focus');
    },
    onBlur: () => {
      drop('focus');
      drop('tap');
    },
    onClick: () => {
      if (openOnTap) add('tap');
    },
  };

  const tooltip: ReactNode = createPortal(
    <span
      ref={tooltipRef}
      id={id}
      role="tooltip"
      className={styles.tooltip}
      hidden={!open}
      style={place ? { left: place.left, top: place.top } : undefined}
      onPointerEnter={enter}
      onPointerLeave={leave}
    >
      {text}
    </span>,
    document.body,
  );

  return { triggerProps, tooltip };
}

/** Whether focus came from the keyboard rather than a click; true where the browser can't tell. */
function focusVisible(element: HTMLElement): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}
