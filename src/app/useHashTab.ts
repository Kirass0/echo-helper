import { useSyncExternalStore } from 'react';
import { tabFromHash, type TabId } from './tabs';

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getSnapshot(): TabId {
  return tabFromHash(window.location.hash);
}

/** The open tab, following the URL hash. */
export function useHashTab(): TabId {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'evaluation');
}
