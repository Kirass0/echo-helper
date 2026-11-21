import { formatBuildDate } from './buildDate';
import { Header } from './Header';
import { PurposeLine } from './PurposeLine';
import { ABOUT_SECTION_FOR_TAB } from './tabs';
import { useHashTab } from './useHashTab';
import styles from './App.module.css';

const PURPOSE = {
  evaluation:
    'Check how good an Echo is for a Resonator, and how likely it is to reach your Target Score once fully tuned.',
  strategy: 'Try different Upgrade Strategies and compare what they cost.',
} as const;

export interface AppProps {
  /** ISO timestamp of the build. */
  buildDate: string;
}

export function App({ buildDate }: AppProps) {
  const tab = useHashTab();

  return (
    <>
      <Header openTab={tab} updated={formatBuildDate(buildDate)} />
      <main className={styles.main} data-tab={tab}>
        {tab !== 'about' && (
          <PurposeLine text={PURPOSE[tab]} aboutSection={ABOUT_SECTION_FOR_TAB[tab]} />
        )}
      </main>
    </>
  );
}
