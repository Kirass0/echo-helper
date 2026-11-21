// The single calculation worker (spec §11). It runs all Core work; the main thread never does.
import { runEchoEvaluation } from './echoEvaluationJob';
import { serveCalculations, type MessagePortLike } from './newestInputWins';

serveCalculations(self as unknown as MessagePortLike, runEchoEvaluation);
