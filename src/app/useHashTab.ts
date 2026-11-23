import { useSyncExternalStore } from 'react';
import { tabFromHash, type TabId } from './tabs';

/** Calls `onChange` whenever the URL hash changes; returns the unsubscribe. */
export function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getSnapshot(): TabId {
  return tabFromHash(window.location.hash);
}

/** The open tab, following the URL hash. */
export function useHashTab(): TabId {
  return useSyncExternalStore(subscribeToHash, getSnapshot, () => 'evaluation');
}
