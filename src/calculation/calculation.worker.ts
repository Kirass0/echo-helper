// The single calculation worker (spec §11). It runs all Core work; the main thread never does.
import { createCacheBudget } from './cacheBudget';
import { createEchoEvaluationJobs } from './echoEvaluationJob';
import { serveCalculations, type MessagePortLike } from './newestInputWins';
import { createTopEchoScoresJobs } from './topEchoScoresJob';
import { createUpgradeStrategyJobs } from './upgradeStrategyJob';

// What every kind of job keeps is counted under one budget (spec §11, "Cache budget").
const cacheBudget = createCacheBudget();
serveCalculations(self as unknown as MessagePortLike, {
  echoEvaluation: createEchoEvaluationJobs({ cacheBudget }),
  upgradeStrategy: createUpgradeStrategyJobs({ cacheBudget }),
  topEchoScores: createTopEchoScoresJobs({ cacheBudget }),
});
