using System.Runtime.InteropServices;
using EchoHelper;

namespace GoldenExport;

/// <summary>
/// The distribution of the Successful Echoes' Echo Values, which the C# Core doesn't return (it gives only the Average and the Minimum).
/// It repeats UpgradeStrategyPass.Calculate step for step, through the same internal rule checks, roll tables and Chance tables
/// (the Core's files are compiled into this project, so its internals are reachable), with two differences:
/// every state keeps its Echo Value to the end (still rounded to 12 decimals at each Tune Stage, as the pass does),
/// and after the last Tune Stage with rules each state is finished with FinishingEchoValues instead of an average and a minimum.
/// Program.cs checks the Success Rate, Average and Minimum against the Core's own result.
/// </summary>
internal static class SuccessfulEchoScores
{
    private const int echoValueDecimals = 12;
    private const double tolerance = 1e-9;
    private const int maxDistributionSteps = 500;
    private static readonly SubstatType[] substatTypes = Enum.GetValues<SubstatType>();

    public sealed record Result(double SuccessRate, double Best, double Worst, double Average, double Median, int OutcomeCount, IReadOnlyList<DistributionPoint> Distribution);

    // Null when no Echo is Successful.
    public static Result? Of(UpgradeStrategy strategy, ValueTable valueTable)
    {
        int lastRuleStage = Enumerable.Range(1, Echo.MaxTuneStage).LastOrDefault(tuneStage => strategy.RuleGroupsAt(tuneStage).Count > 0);
        var context = new UpgradeRuleContext(valueTable, strategy);
        var states = new Dictionary<TunedEcho, double> { { new TunedEcho(0, 0, 0), 1 } };

        for (int tuneStage = 1; tuneStage <= lastRuleStage; tuneStage++)
        {
            var ruleGroups = strategy.RuleGroupsAt(tuneStage);
            ulong keptRolls = context.RollsReadFrom(tuneStage + 1);
            double typeChance = 1.0 / (substatTypes.Length - tuneStage + 1);
            var next = new Dictionary<TunedEcho, double>();
            if (ruleGroups.Any(rules => rules.Any(rule => rule is ChanceRule)))
                context.PrepareChances(states.Keys.SelectMany(echo => substatTypes.Where(type => !echo.Has(type)).Select(type => echo.Types | TunedEcho.Bit(type))), default);

            foreach (var (echo, chance) in states)
            {
                foreach (var type in substatTypes)
                {
                    if (echo.Has(type))
                        continue;
                    foreach (var roll in context.RollsAt(tuneStage, type))
                    {
                        var tuned = new TunedEcho(echo.Types | TunedEcho.Bit(type), echo.EchoValue + roll.EchoValue, echo.Rolls | roll.Bits);
                        if (ruleGroups.Count > 0 && !ruleGroups.Any(rules => rules.All(rule => rule.Passes(tuned, context))))
                            continue;
                        var kept = new TunedEcho(tuned.Types, Math.Round(tuned.EchoValue, echoValueDecimals), tuned.Rolls & keptRolls);
                        CollectionsMarshal.GetValueRefOrAddDefault(next, kept, out _) += chance * typeChance * roll.Chance;
                    }
                }
            }
            states = next;
        }
        if (states.Count == 0)
            return null;

        // Each Substat type set is finished once, from an Echo Value of 0, and shifted by every Echo Value of the states with that set.
        var finalChances = new Dictionary<double, double>();
        foreach (var byTypes in states.GroupBy(state => state.Key.Types))
        {
            var finishing = FinishingEchoValues.Of(substatTypes.Where(type => (byTypes.Key & TunedEcho.Bit(type)) != 0).ToList(), 0, valueTable).Outcomes;
            var current = new Dictionary<double, double>();
            foreach (var (echo, chance) in byTypes)
                CollectionsMarshal.GetValueRefOrAddDefault(current, echo.EchoValue, out _) += chance;
            foreach (var (echoValue, chance) in current)
            {
                foreach (var outcome in finishing)
                    CollectionsMarshal.GetValueRefOrAddDefault(finalChances, Math.Round(echoValue + outcome.EchoValue, echoValueDecimals), out _) += chance * outcome.Chance;
            }
        }

        double successRate = finalChances.Values.Sum();
        var echoValues = finalChances.Keys.ToArray();
        var chances = finalChances.Values.Select(chance => chance / successRate).ToArray();
        Array.Sort(echoValues, chances);
        var chanceAtOrAbove = new double[echoValues.Length + 1];
        for (int i = echoValues.Length - 1; i >= 0; i--)
            chanceAtOrAbove[i] = chanceAtOrAbove[i + 1] + chances[i];
        double ChanceAtOrAbove(double echoValue)
        {
            int index = Array.BinarySearch(echoValues, echoValue - tolerance);
            return Math.Clamp(chanceAtOrAbove[index >= 0 ? index : ~index], 0.0, 1.0);
        }

        double median = echoValues[^1];
        double chanceAtOrBelow = 0;
        for (int i = 0; i < echoValues.Length; i++)
        {
            chanceAtOrBelow += chances[i];
            if (chanceAtOrBelow >= 0.5 - tolerance)
            {
                median = echoValues[i];
                break;
            }
        }

        // Thresholds as Echo Evaluation picks them: real Echo Values from Worst to Best, at most about 500.
        double worst = echoValues[0], best = echoValues[^1];
        double mergeGap = (best - worst) / maxDistributionSteps;
        var thresholds = new List<double> { worst };
        foreach (var echoValue in echoValues.Skip(1))
        {
            if (echoValue - thresholds[^1] >= mergeGap)
                thresholds.Add(echoValue);
        }
        if (thresholds[^1] < best)
            thresholds.Add(best);

        return new Result(
            successRate,
            Best: best,
            Worst: worst,
            Average: echoValues.Select((echoValue, i) => echoValue * chances[i]).Sum(),
            Median: median,
            OutcomeCount: echoValues.Length,
            Distribution: thresholds.ConvertAll(threshold => new DistributionPoint(threshold, ChanceAtOrAbove(threshold))));
    }
}
