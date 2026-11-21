import type { ReactNode } from 'react';

/** Thin-stroke icons on a 24-unit grid, drawn in the current text colour. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** A table's weights. */
export function SlidersIcon() {
  return (
    <Icon>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </Icon>
  );
}

/** Change a Substat. */
export function PencilIcon() {
  return (
    <Icon>
      <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" />
      <path d="M13.5 6.5l4 4" />
    </Icon>
  );
}

/** Remove. */
export function CrossIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

/** Switch to the light theme. */
export function SunIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Icon>
  );
}

/** Switch to the dark theme. */
export function MoonIcon() {
  return (
    <Icon>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </Icon>
  );
}
