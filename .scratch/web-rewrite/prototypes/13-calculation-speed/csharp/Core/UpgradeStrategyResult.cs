namespace EchoHelper
{
    /// <summary>
    /// The exact result of an Upgrade Strategy on fresh Echoes. Rates are in [0, 1].
    /// The per-kept-Echo results are null when no Echo is kept.
    /// </summary>
    public record UpgradeStrategyResult(
        double SuccessRate,
        AverageCost? AverageCostPerKeptEcho,
        IReadOnlyList<TuneStageDiscards> Discards,
        double? AverageKeptEchoValue,
        double? MinimumKeptEchoValue);

    /// <summary>
    /// What it costs on average to end up with one kept Echo, counting the Echoes discarded along the way.
    /// </summary>
    public record AverageCost(double Echoes, double Exp, double Tuners, double ShellCredits);

    /// <summary>
    /// The Discard Rate: the share of all Echoes started that are discarded at <see cref="TuneStage"/>.
    /// </summary>
    public readonly record struct TuneStageDiscards(int TuneStage, double DiscardRate);
}
