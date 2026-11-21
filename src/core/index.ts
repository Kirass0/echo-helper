// The public Core API. Core has no React or DOM imports; it runs in Node for tests and in a Web Worker in the app.

export {
  MAX_TUNE_STAGE,
  SUBSTAT_TYPES,
  possibleRolls,
  referenceRoll,
  type PossibleRoll,
  type SubstatType,
} from './gameData';
export { substatWeightTable, type SubstatWeightTable } from './substatWeightTable';
export { seededRandom, type RandomSource } from './random';
export { Echo, echoScore } from './echo';
export { roundTo12Decimals } from './rounding';
export { addTuningCosts, tuningCost, type TuningCost } from './tuningCost';
export { echoScoreDistribution, type EchoScoreDistribution } from './echoScoreDistribution';
export {
  finishingEchoScores,
  finishingEchoScoresFor,
  type FinishingEchoScores,
  type FinishingOutcome,
} from './finishingEchoScores';
export {
  evaluateEcho,
  type CalculationOptions,
  type DistributionPoint,
  type EchoEvaluation,
  type EchoOutlook,
  type FullyTunedVerdict,
} from './evaluateEcho';
export {
  UpgradeRule,
  upgradeStrategy,
  type RuleGroup,
  type UpgradeStrategy,
} from './upgradeStrategy';
export {
  FinishingTableCache,
  calculateUpgradeStrategy,
  type CostPerSuccessfulEcho,
  type SuccessfulEchoScores,
  type TuneStageDiscards,
  type UpgradeStrategyOptions,
  type UpgradeStrategyResult,
} from './upgradeStrategyPass';
