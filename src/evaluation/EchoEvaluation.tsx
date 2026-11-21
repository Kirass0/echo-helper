import { useEffect, useMemo, useState } from 'react';
import { BUILT_IN_TABLES, type WeightTableData } from '../catalogue/catalogue';
import type { Calculator } from '../calculation/newestInputWins';
import type {
  EchoEvaluationInput,
  EchoEvaluationResult,
  SubstatEntry,
} from '../calculation/protocol';
import surfaces from '../ui/surfaces.module.css';
import { ResultBoxes } from './ResultBoxes';
import { parseTarget } from './targetScore';
import { WeightTableList, type ListedTable } from './WeightTableList';
import { YourEcho } from './YourEcho';
import styles from './EchoEvaluation.module.css';

export interface EchoEvaluationProps {
  calculator: Calculator;
  builtInTables?: readonly WeightTableData[];
}

/** The Echo Evaluation tab: Your Echo on the left; results and the Substat Weight Tables list on the right. */
export function EchoEvaluation({
  calculator,
  builtInTables = BUILT_IN_TABLES,
}: EchoEvaluationProps) {
  const [substats, setSubstats] = useState<SubstatEntry[]>([]);
  const [listed, setListed] = useState<ListedTable | null>(null);

  const input = useMemo((): EchoEvaluationInput | null => {
    const table = listed && builtInTables.find((candidate) => candidate.name === listed.name);
    if (!listed || !table) return null;
    return {
      substats,
      table,
      targetScore: parseTarget(listed.targetText).value,
      erTargetScore: parseTarget(listed.erTargetText).value,
    };
  }, [substats, listed, builtInTables]);
  const result = useEchoEvaluationResult(calculator, input);

  return (
    <div className={styles.layout}>
      <div className={`${surfaces.panel} ${styles.echo}`}>
        <YourEcho substats={substats} onChange={setSubstats} />
      </div>
      <div className={styles.right}>
        <section className={surfaces.panel} aria-label="Results">
          {listed ? (
            <>
              <h2 className={styles.tableName}>{listed.name}</h2>
              <ResultBoxes result={result} />
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
        <div className={surfaces.panel}>
          <WeightTableList
            builtInTables={builtInTables}
            listed={listed}
            onAdd={(name) => setListed({ name, targetText: '', erTargetText: '' })}
            onTargetsChange={(targets) => listed && setListed({ ...listed, ...targets })}
          />
        </div>
      </div>
    </div>
  );
}

/** The newest result for the input: every change is sent at once, with no debounce, and older results are dropped. */
function useEchoEvaluationResult(
  calculator: Calculator,
  input: EchoEvaluationInput | null,
): EchoEvaluationResult | null {
  const [result, setResult] = useState<EchoEvaluationResult | null>(null);
  useEffect(() => {
    if (input) calculator.evaluate(input, setResult);
  }, [calculator, input]);
  return result;
}
