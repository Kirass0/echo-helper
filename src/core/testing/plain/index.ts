// The plain Map-based port of the Core's calculations, kept as the exact reference for the fast-versus-plain suite.
// Its results match the fast Core's public API in shape.

export { echoScoreDistribution } from './echoScoreDistribution';
export { finishingEchoScores, finishingEchoScoresFor } from './finishingEchoScores';
export { evaluateEcho } from './evaluateEcho';
export { FinishingTableCache, calculateUpgradeStrategy } from './upgradeStrategyPass';
