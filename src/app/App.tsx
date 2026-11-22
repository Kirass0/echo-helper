import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Calculator } from '../calculation/newestInputWins';
import { BUILT_IN_TABLES, findTable, type WeightTableData } from '../catalogue/catalogue';
import { salvageNotices } from '../customTables/customTablesEntry';
import { createTableEvents } from '../customTables/tableEvents';
import { useCustomTables } from '../customTables/useCustomTables';
import { EchoEvaluation } from '../evaluation/EchoEvaluation';
import { followRenamesInEchoEvaluation } from '../evaluation/useRememberedEchoEvaluation';
import { UpgradeStrategy } from '../strategy/UpgradeStrategy';
import { formatBuildDate } from './buildDate';
import { Header } from './Header';
import { Notices } from './Notices';
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
  /** Where all calculation goes: in the app, the calculation worker. */
  calculator: Calculator;
  /** The Built-in Substat Weight Tables; tests pass their own. */
  builtInTables?: readonly WeightTableData[];
}

export function App({ buildDate, calculator, builtInTables = BUILT_IN_TABLES }: AppProps) {
  const tab = useHashTab();
  // Loaded before any tab, so what the tabs remember under a renamed table's name is repaired before they read it.
  const customTables = useCustomTables(builtInTables, followRenamesInEchoEvaluation);
  // Renames and deletions in one tab's weights dialog, told to the other.
  const [tableEvents] = useState(createTableEvents);
  const allTables = useMemo(
    () => [...customTables.tables, ...builtInTables],
    [customTables.tables, builtInTables],
  );

  // Upgrade Strategy's table, by name. A name that no longer exists means no table.
  const [strategyTable, setStrategyTable] = useState<string | null>(null);
  useEffect(
    () =>
      tableEvents.subscribe((event) => {
        if (event.kind === 'renamed')
          setStrategyTable((name) => (name === event.from ? event.to : name));
      }),
    [tableEvents],
  );
  // While Upgrade Strategy has no table, a table added on Echo Evaluation is picked there too (spec §8).
  const pickIfNoTable = useCallback(
    (added: string) =>
      setStrategyTable((name) =>
        name !== null && findTable(allTables, name) !== undefined ? name : added,
      ),
    [allTables],
  );

  return (
    <>
      <Header openTab={tab} updated={formatBuildDate(buildDate)} />
      <Notices notices={salvageNotices(customTables.salvaged)} />
      <main className={styles.main} data-tab={tab}>
        {tab !== 'about' && (
          <PurposeLine text={PURPOSE[tab]} aboutSection={ABOUT_SECTION_FOR_TAB[tab]} />
        )}
        {/* Kept mounted while hidden, so switching tabs loses nothing. */}
        <div hidden={tab !== 'evaluation'}>
          {customTables.ready && (
            <EchoEvaluation
              calculator={calculator}
              builtInTables={builtInTables}
              customTables={customTables.tables}
              onCustomTablesChange={customTables.save}
              onTableAdded={pickIfNoTable}
              tableEvents={tableEvents}
            />
          )}
        </div>
        <div hidden={tab !== 'strategy'}>
          {customTables.ready && (
            <UpgradeStrategy
              calculator={calculator}
              builtInTables={builtInTables}
              customTables={customTables.tables}
              onCustomTablesChange={customTables.save}
              tableName={strategyTable}
              onTableChange={setStrategyTable}
              tableEvents={tableEvents}
            />
          )}
        </div>
      </main>
    </>
  );
}
