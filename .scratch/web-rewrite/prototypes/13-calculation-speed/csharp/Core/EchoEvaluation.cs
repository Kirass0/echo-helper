namespace EchoHelper
{
    /// <summary>
    /// The result of evaluating an Echo. A partly tuned Echo has an <see cref="Outlook"/>;
    /// a fully tuned (5/5) Echo has a <see cref="Verdict"/> instead.
    /// </summary>
    public record EchoEvaluation(
        double CurrentEchoValue,
        double? TargetValue,
        double? ErTargetValue,
        EchoOutlook? Outlook,
        FullyTunedVerdict? Verdict);

    /// <summary>
    /// What a partly tuned Echo can still become: the Echo Values it can finish with at Tune Stage 5. Chances are in [0, 1].
    /// There is always a <see cref="Distribution"/>, from Worst to Best; with a Target Value there is also a <see cref="ChanceToReachTarget"/>.
    /// The with-ER results are present only when an ER Target Value was given, and <see cref="DistributionWithEr"/> has the same thresholds.
    /// </summary>
    public record EchoOutlook(
        double Best,
        double Worst,
        double Average,
        double Median,
        double? ChanceToReachTarget,
        double? ChanceToReachErTarget,
        IReadOnlyList<DistributionPoint> Distribution,
        IReadOnlyList<DistributionPoint>? DistributionWithEr);

    /// <summary>
    /// The chance that the Echo finishes with an Echo Value at or above <see cref="Threshold"/>.
    /// </summary>
    public readonly record struct DistributionPoint(double Threshold, double Chance);

    /// <summary>
    /// Verdicts for a 5/5 Echo. Each is null when it does not apply: no Target Value given,
    /// or no ER Target Value given / the Echo has no Energy Regen.
    /// </summary>
    public record FullyTunedVerdict(bool? ReachesTarget, bool? ReachesErTarget);
}
