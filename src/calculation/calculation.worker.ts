// The single calculation worker (spec §11). It runs all Core work; the main thread never does.
import { createEchoEvaluationJobs } from './echoEvaluationJob';
import { serveCalculations, type MessagePortLike } from './newestInputWins';
import { createTopEchoScoresJobs } from './topEchoScoresJob';
import { createUpgradeStrategyJobs } from './upgradeStrategyJob';

serveCalculations(self as unknown as MessagePortLike, {
  echoEvaluation: createEchoEvaluationJobs(),
  upgradeStrategy: createUpgradeStrategyJobs(),
  topEchoScores: createTopEchoScoresJobs(),
});
