import type { Calculator } from '../calculation/newestInputWins';
import type { WeightTableData } from '../catalogue/catalogue';
import { useCustomTables } from '../customTables/useCustomTables';
import { EchoEvaluation } from '../evaluation/EchoEvaluation';
import { followRenamesInEchoEvaluation } from '../evaluation/useRememberedEchoEvaluation';

/** Echo Evaluation on its own, holding the Custom tables as the app does. */
export function EchoEvaluationTab({
  calculator,
  builtInTables,
}: {
  calculator: Calculator;
  builtInTables: readonly WeightTableData[];
}) {
  const { tables, save } = useCustomTables(builtInTables, followRenamesInEchoEvaluation);
  return (
    <EchoEvaluation
      calculator={calculator}
      builtInTables={builtInTables}
      customTables={tables}
      onCustomTablesChange={save}
    />
  );
}
