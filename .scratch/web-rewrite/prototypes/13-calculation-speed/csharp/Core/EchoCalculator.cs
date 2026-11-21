namespace EchoHelper
{
    public static class EchoCalculator
    {
        // A chance this close to a threshold counts as reaching it, so floating-point summation order never decides the Median.
        private const double chanceTolerance = 1e-9;

        // Caps a distribution at about this many points; a chart can't show more across its width.
        private const int maxDistributionSteps = 500;

        /// <summary>
        /// The exact result of tuning fresh Echoes with an Upgrade Strategy. Progress is reported once per Tune Stage.
        /// </summary>
        public static UpgradeStrategyResult CalculateUpgradeStrategy(UpgradeStrategy strategy, ValueTable valueTable,
            IProgress<double>? progress = null, CancellationToken cancellationToken = default) =>
            UpgradeStrategyPass.Calculate(strategy, valueTable, progress, cancellationToken);

        public static EchoEvaluation EvaluateEcho(Echo echo, ValueTable valueTable, double? targetValue, double? erTargetValue,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            double currentEchoValue = echo.GetEchoValue(valueTable);
            var finishing = FinishingEchoValues.Of(echo, valueTable);
            cancellationToken.ThrowIfCancellationRequested();

            EchoEvaluation evaluation;
            if (echo.TuneStage == Echo.MaxTuneStage)
            {
                // A 5/5 Echo finishes at its Echo Value, so it reaches a target exactly when it has any chance to.
                bool? reachesTarget = targetValue is double target ? finishing.ChanceAtOrAbove(target) > 0 : null;
                bool? reachesErTarget = erTargetValue is double erTarget && echo.Substats.ContainsKey(SubstatType.Energy_Regen) ? finishing.ChanceWithErAtOrAbove(erTarget) > 0 : null;
                evaluation = new EchoEvaluation(currentEchoValue, targetValue, erTargetValue, null, new FullyTunedVerdict(reachesTarget, reachesErTarget));
            }
            else
            {
                evaluation = new EchoEvaluation(currentEchoValue, targetValue, erTargetValue, OutlookOf(finishing, targetValue, erTargetValue), null);
            }
            return evaluation;
        }

        private static EchoOutlook OutlookOf(FinishingEchoValues finishing, double? targetValue, double? erTargetValue)
        {
            var outcomes = finishing.Outcomes;
            var thresholds = GetThresholds(outcomes);
            return new EchoOutlook(
                Best: outcomes[^1].EchoValue,
                Worst: outcomes[0].EchoValue,
                Average: outcomes.Sum(outcome => outcome.EchoValue * outcome.Chance),
                Median: GetMedian(outcomes),
                ChanceToReachTarget: targetValue is double target ? finishing.ChanceAtOrAbove(target) : null,
                ChanceToReachErTarget: erTargetValue is double erTarget ? finishing.ChanceWithErAtOrAbove(erTarget) : null,
                Distribution: GetDistribution(thresholds, finishing.ChanceAtOrAbove),
                DistributionWithEr: erTargetValue is not null ? GetDistribution(thresholds, finishing.ChanceWithErAtOrAbove) : null);
        }

        private static List<DistributionPoint> GetDistribution(List<double> thresholds, Func<double, double> chanceAtOrAbove) =>
            thresholds.ConvertAll(threshold => new DistributionPoint(threshold, chanceAtOrAbove(threshold)));

        // Real Echo Values from Worst to Best, so the steps stay exact; one closer than the merge gap to the last kept is skipped, except Best.
        private static List<double> GetThresholds(IReadOnlyList<FinishingEchoValue> outcomes)
        {
            double worst = outcomes[0].EchoValue;
            double best = outcomes[^1].EchoValue;
            double mergeGap = (best - worst) / maxDistributionSteps;
            var thresholds = new List<double> { worst };
            foreach (var outcome in outcomes.Skip(1))
            {
                if (outcome.EchoValue - thresholds[^1] >= mergeGap)
                    thresholds.Add(outcome.EchoValue);
            }
            if (thresholds[^1] < best)
                thresholds.Add(best);
            return thresholds;
        }

        // The lowest Echo Value with a chance of at least half to finish at or below it.
        private static double GetMedian(IReadOnlyList<FinishingEchoValue> outcomes)
        {
            double chanceAtOrBelow = 0;
            foreach (var outcome in outcomes)
            {
                chanceAtOrBelow += outcome.Chance;
                if (chanceAtOrBelow >= 0.5 - chanceTolerance)
                    return outcome.EchoValue;
            }
            return outcomes[^1].EchoValue;
        }
    }
}
