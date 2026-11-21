import { useEffect, useMemo, useState } from 'react';
import { BUILT_IN_TABLES, type WeightTableData } from '../catalogue/catalogue';
import type { Calculator } from '../calculation/newestInputWins';
import type {
  EchoEvaluationListInput,
  EchoEvaluationResult,
  ListedTableInput,
  SubstatEntry,
} from '../calculation/protocol';
import surfaces from '../ui/surfaces.module.css';
import { EchoDistributionChart } from './EchoDistributionChart';
import { ResultBoxes } from './ResultBoxes';
import { parseTarget } from './targetScore';
import { WeightTableList, type TargetTexts } from './WeightTableList';
import { YourEcho } from './YourEcho';
import styles from './EchoEvaluation.module.css';

export interface EchoEvaluationProps {
  calculator: Calculator;
  builtInTables?: readonly WeightTableData[];
}

const NO_TARGETS: TargetTexts = { targetText: '', erTargetText: '' };

/** The Echo Evaluation tab: Your Echo on the left; results and the Substat Weight Tables list on the right. */
export function EchoEvaluation({
  calculator,
  builtInTables = BUILT_IN_TABLES,
}: EchoEvaluationProps) {
  const [substats, setSubstats] = useState<SubstatEntry[]>([]);
  /** The listed tables' names, top to bottom. */
  const [listed, setListed] = useState<readonly string[]>([]);
  const [focused, setFocused] = useState<string | null>(null);
  /** What is typed in each table's target boxes, remembered per table name even while it is unlisted. */
  const [targets, setTargets] = useState<Readonly<Record<string, TargetTexts>>>({});
  const targetsOf = (name: string) => targets[name] ?? NO_TARGETS;

  const input = useMemo((): EchoEvaluationListInput | null => {
    const tables = listed.flatMap((name): ListedTableInput[] => {
      const table = builtInTables.find((candidate) => candidate.name === name);
      if (!table) return [];
      const { targetText, erTargetText } = targets[name] ?? NO_TARGETS;
      return [
        {
          table,
          targetScore: parseTarget(targetText).value,
          erTargetScore: parseTarget(erTargetText).value,
        },
      ];
    });
    return tables.length ? { substats, tables, focusedTableName: focused } : null;
  }, [substats, listed, focused, targets, builtInTables]);
  const results = useEchoEvaluationResults(calculator, input);

  function add(name: string) {
    setListed([...listed, name]);
    setFocused(name);
  }

  function swap(index: number, name: string) {
    const old = listed[index];
    setListed(listed.map((listedName, i) => (i === index ? name : listedName)));
    if (focused === old) setFocused(name);
  }

  function remove(index: number) {
    const removed = listed[index];
    if (focused === removed) setFocused(listed[index + 1] ?? listed[index - 1] ?? null);
    setListed(listed.filter((_, i) => i !== index));
  }

  return (
    <div className={styles.layout}>
      <div className={`${surfaces.panel} ${styles.echo}`}>
        <YourEcho substats={substats} onChange={setSubstats} />
      </div>
      <div className={styles.right}>
        <section className={surfaces.panel} aria-label="Results">
          {focused !== null ? (
            <>
              <h2 className={styles.tableName} title={focused}>
                {focused}
              </h2>
              <ResultBoxes result={results[focused] ?? null} />
            </>
          ) : (
            <div className={styles.prompt}>
              <p className={styles.promptLine}>
                <strong>Pick a Substat Weight Table for your Resonator below.</strong>
              </p>
              <p className={styles.promptSmall}>
                Each table determines how much each Substat is worth to one Resonator. You can add
                more than one and switch between them.
              </p>
            </div>
          )}
        </section>
        {focused !== null && (
          <div className={surfaces.panel}>
            <EchoDistributionChart
              focused={focused}
              tables={listed.map((name) => ({
                name,
                targetScore: parseTarget(targetsOf(name).targetText).value,
                erTargetScore: parseTarget(targetsOf(name).erTargetText).value,
                result: results[name] ?? null,
              }))}
            />
          </div>
        )}
        <div className={surfaces.panel}>
          <WeightTableList
            builtInTables={builtInTables}
            rows={listed.map((name) => ({
              name,
              ...targetsOf(name),
              result: results[name] ?? null,
            }))}
            focused={focused}
            onAdd={add}
            onSwap={swap}
            onRemove={remove}
            onFocus={setFocused}
            onTargetsChange={(name, texts) => setTargets({ ...targets, [name]: texts })}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * The newest result for each listed table: every change is sent at once, with no debounce, and each table's result
 * replaces its last one as soon as it arrives; results of outdated inputs are dropped.
 */
function useEchoEvaluationResults(
  calculator: Calculator,
  input: EchoEvaluationListInput | null,
): Readonly<Record<string, EchoEvaluationResult>> {
  const [results, setResults] = useState<Readonly<Record<string, EchoEvaluationResult>>>({});
  useEffect(() => {
    if (input)
      calculator.evaluate(input, (result) =>
        setResults((last) => ({ ...last, [result.tableName]: result })),
      );
  }, [calculator, input]);
  return results;
}
