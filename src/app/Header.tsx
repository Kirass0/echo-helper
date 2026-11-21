import { TABS, type TabId } from './tabs';
import styles from './Header.module.css';

export interface HeaderProps {
  openTab: TabId;
  /** The formatted build date, e.g. "20 Nov 2026". */
  updated: string;
}

export function Header({ openTab, updated }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.brand}>Echo Helper</span>
        <nav className={styles.tabs} aria-label="Tabs">
          {TABS.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={styles.tab}
              aria-current={tab.id === openTab ? 'page' : undefined}
            >
              {tab.label}
            </a>
          ))}
        </nav>
        <div className={styles.end}>
          <span className={styles.updated}>Updated {updated}</span>
          {/* Reserved for the theme button (ticket 02). */}
          <span className={styles.themeSlot} data-testid="theme-slot" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
