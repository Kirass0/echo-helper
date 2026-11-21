// The messages between the app and the calculation worker. Everything here is plain data, so it survives
// structured cloning.
import type { WeightTableData } from '../catalogue/catalogue';
import type { SubstatType } from '../core/gameData';

/** One Substat on the Echo. */
export interface SubstatEntry {
  readonly type: SubstatType;
  readonly value: number;
}

/** What Echo Evaluation asks for one Weight Table. */
export interface EchoEvaluationInput {
  /** The Substats in slot order, which is the order their contributions are summed in. */
  readonly substats: readonly SubstatEntry[];
  readonly table: WeightTableData;
  readonly targetScore: number | null;
  readonly erTargetScore: number | null;
}

/**
 * The figures behind the eight result boxes. Chances are in [0, 1]. At 5/5 the chances are null and the verdicts are
 * set (null when the target is empty, or the ER one when the Echo has no Energy Regen); before 5/5 it's the other way
 * round. Median, Average and Best are the final Echo Score at 5/5.
 */
export interface EchoEvaluationResult {
  readonly tableName: string;
  readonly fullyTuned: boolean;
  readonly hasEnergyRegen: boolean;
  readonly echoScore: number;
  readonly topPercent: number;
  /** Null while the Echo has no Energy Regen. */
  readonly erTopPercent: number | null;
  readonly targetChance: number | null;
  readonly erTargetChance: number | null;
  readonly reachesTarget: boolean | null;
  readonly reachesErTarget: boolean | null;
  readonly median: number;
  readonly average: number;
  readonly best: number;
}

export interface EchoEvaluationRequest {
  readonly kind: 'echoEvaluation';
  readonly id: number;
  readonly input: EchoEvaluationInput;
}

export interface EchoEvaluationResponse {
  readonly kind: 'echoEvaluation';
  readonly id: number;
  readonly result: EchoEvaluationResult;
}
