import { useSyncExternalStore } from 'react';

/** The phone width (spec §14), as in the stylesheets' `max-width: 600px`. */
export const PHONE_QUERY = '(max-width: 600px)';

// jsdom has no matchMedia: there the layout is the desktop one.
const query = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia(PHONE_QUERY) : null;

function subscribe(onChange: () => void) {
  const list = query();
  list?.addEventListener('change', onChange);
  return () => list?.removeEventListener('change', onChange);
}

/** Whether the screen is phone width, following it as it changes. */
export function usePhoneLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => query()?.matches ?? false,
    () => false,
  );
}
