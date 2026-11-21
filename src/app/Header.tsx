import { IconButton } from '../ui/IconButton';
import { MoonIcon, SunIcon } from '../ui/icons';
import { TABS, type TabId } from './tabs';
import { useTheme } from './theme';
import styles from './Header.module.css';

export interface HeaderProps {
  openTab: TabId;
  /** The formatted build date, e.g. "20 Nov 2026". */
  updated: string;
}

/** Sun while dark, moon while light. */
function ThemeButton() {
  const [theme, toggle] = useTheme();
  return theme === 'dark' ? (
    <IconButton label="Switch to light theme" icon={<SunIcon />} onClick={toggle} />
  ) : (
    <IconButton label="Switch to dark theme" icon={<MoonIcon />} onClick={toggle} />
  );
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
          <ThemeButton />
        </div>
      </div>
    </header>
  );
}
