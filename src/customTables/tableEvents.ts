// Renames and deletions of Custom tables, told to every tab of the app: each tab has a weights dialog, and what the
// others remember by table name follows along (spec §12, "Forgetting").

export type TableEvent =
  | { readonly kind: 'renamed'; readonly from: string; readonly to: string }
  | { readonly kind: 'deleted'; readonly name: string };

export interface TableEvents {
  publish(event: TableEvent): void;
  /** Calls `listener` on every event published from now on; returns how to stop. */
  subscribe(listener: (event: TableEvent) => void): () => void;
}

export function createTableEvents(): TableEvents {
  const listeners = new Set<(event: TableEvent) => void>();
  return {
    publish(event) {
      for (const listener of [...listeners]) listener(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
