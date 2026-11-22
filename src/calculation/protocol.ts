// The messages between the app and the calculation worker. Everything here is plain data, so it survives
// structured cloning.
import type { WeightTableData } from '../catalogue/catalogue';
import type { SubstatType } from '../core/gameData';
import type { UpgradeStrategy } from '../core/upgradeStrategy';
import type { UpgradeStrategyResult } from '../core/upgradeStrategyPass';

export type { UpgradeStrategyResult };

/** One Substat on the Echo. */
export interface SubstatEntry {
  readonly type: SubstatType;
  readonly value: number;
}

/** A listed Weight Table and its targets. */
export interface ListedTableInput {
  readonly table: WeightTableData;
  readonly targetScore: number | null;
  readonly erTargetScore: number | null;
}

/** What Echo Evaluation asks for: one Echo against every listed Weight Table. */
export interface EchoEvaluationListInput {
  /** The Substats in slot order, which is the order their contributions are summed in. */
  readonly substats: readonly SubstatEntry[];
  /** The listed tables, top to bottom. */
  readonly tables: readonly ListedTableInput[];
  readonly focusedTableName: string | null;
}

/** One job: Echo Evaluation for one Weight Table. */
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
  /**
   * Where the Echo can finish: the chance of finishing at or above each of a few hundred real Echo Scores, from Worst
   * to Best, so the first threshold is the Worst Echo Score. At 5/5 it is the final Echo Score, for sure.
   */
  readonly distribution: readonly ChanceAtOrAbove[];
}

/** The chance, in [0, 1], that the Echo finishes with an Echo Score at or above the threshold. */
export interface ChanceAtOrAbove {
  readonly threshold: number;
  readonly chance: number;
}

export interface EchoEvaluationRequest {
  readonly kind: 'echoEvaluation';
  readonly id: number;
  readonly input: EchoEvaluationListInput;
}

/** The result for one of the request's Weight Tables, posted as soon as it is ready. */
export interface EchoEvaluationResponse {
  readonly kind: 'echoEvaluation';
  readonly id: number;
  readonly result: EchoEvaluationResult;
}

/** Which strategy a request is for: Strategy A, the only one unless comparing, or Strategy B. */
export type StrategyName = 'A' | 'B';

/** What Upgrade Strategy asks for: one finished strategy on fresh Echoes, for one Weight Table. */
export interface UpgradeStrategyInput {
  readonly strategy: UpgradeStrategy;
  readonly table: WeightTableData;
}

export interface UpgradeStrategyRequest {
  readonly kind: 'upgradeStrategy';
  readonly id: number;
  readonly strategy: StrategyName;
  readonly input: UpgradeStrategyInput;
}

export interface UpgradeStrategyResponse {
  readonly kind: 'upgradeStrategy';
  readonly id: number;
  readonly strategy: StrategyName;
  readonly result: UpgradeStrategyResult;
}

/** What loading an example asks for: the Echo Score of a Top x% Echo for one Weight Table, for each x. */
export interface TopEchoScoresInput {
  readonly table: WeightTableData;
  /** Each x, in [0, 1]. */
  readonly topPercents: readonly number[];
}

/** The Echo Score of a Top x% Echo for each of the input's Top Percents, in the same order. */
export interface TopEchoScoresResult {
  readonly echoScores: readonly number[];
}

export interface TopEchoScoresRequest {
  readonly kind: 'topEchoScores';
  readonly id: number;
  readonly strategy: StrategyName;
  readonly input: TopEchoScoresInput;
}

export interface TopEchoScoresResponse {
  readonly kind: 'topEchoScores';
  readonly id: number;
  readonly strategy: StrategyName;
  readonly result: TopEchoScoresResult;
}

/**
 * A job that threw, so its result never comes (spec §11, "Failure"). Echo Evaluation's names its Weight Table; the
 * other kinds have one job per request.
 */
export interface FailedResponse {
  readonly kind: 'failed';
  readonly id: number;
  readonly tableName?: string;
}

/** Where the app is, by the tab's id: the visible tab's jobs run first (spec §11, "Job order"). */
export type CalculatingTab = 'evaluation' | 'strategy';

export interface VisibleTabRequest {
  readonly kind: 'visibleTab';
  readonly tab: CalculatingTab;
}

export type CalculationRequest =
  EchoEvaluationRequest | UpgradeStrategyRequest | TopEchoScoresRequest | VisibleTabRequest;
export type CalculationResponse =
  EchoEvaluationResponse | UpgradeStrategyResponse | TopEchoScoresResponse | FailedResponse;
