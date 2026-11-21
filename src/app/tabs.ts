export type TabId = 'evaluation' | 'strategy' | 'about';

export interface Tab {
  id: TabId;
  label: string;
}

export const TABS: readonly Tab[] = [
  { id: 'evaluation', label: 'Echo Evaluation' },
  { id: 'strategy', label: 'Upgrade Strategy' },
  { id: 'about', label: 'About' },
];

/** About section anchors that a tab's "How it works" link points to. */
export const ABOUT_SECTION_FOR_TAB = {
  evaluation: 'about-evaluating-an-echo',
  strategy: 'about-upgrade-strategies',
} as const satisfies Partial<Record<TabId, `about-${string}`>>;

/** The tab a URL hash opens: `#about-<section>` opens About; an empty or unknown hash opens Echo Evaluation. */
export function tabFromHash(hash: string): TabId {
  const id = hash.replace(/^#/, '');
  if (id === 'strategy') return 'strategy';
  if (id === 'about' || id.startsWith('about-')) return 'about';
  return 'evaluation';
}
