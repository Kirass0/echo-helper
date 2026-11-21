namespace EchoHelper
{
    /// <summary>
    /// The EXP, Tuners and Shell Credits spent to tune an Echo up to a Tune Stage.
    /// </summary>
    public readonly record struct TuningCost(ulong Exp, ulong Tuners, ulong ShellCredits)
    {
        // Cumulative, indexed by Tune Stage.
        private static readonly TuningCost[] costToReach =
        {
            new TuningCost(),
            new TuningCost(Exp: 4400, Tuners: 10, ShellCredits: 2440),
            new TuningCost(Exp: 16500, Tuners: 20, ShellCredits: 5650),
            new TuningCost(Exp: 39600, Tuners: 30, ShellCredits: 9960),
            new TuningCost(Exp: 79100, Tuners: 40, ShellCredits: 15910),
            new TuningCost(Exp: 142600, Tuners: 50, ShellCredits: 24260),
        };

        /// <summary>
        /// What an Echo tuned to <paramref name="tuneStage"/> ends up costing, after the refund if it is discarded.
        /// </summary>
        public static TuningCost Of(int tuneStage, bool discarded)
        {
            ArgumentOutOfRangeException.ThrowIfNegative(tuneStage);
            ArgumentOutOfRangeException.ThrowIfGreaterThan(tuneStage, Echo.MaxTuneStage);

            var cost = costToReach[tuneStage];
            // A Discard refunds 75% of EXP and 30% of Tuners, but no Shell Credits.
            return discarded ? new TuningCost((ulong)(cost.Exp * 0.25), (ulong)(cost.Tuners * 0.7), cost.ShellCredits) : cost;
        }

        public static TuningCost operator +(TuningCost a, TuningCost b) =>
            new TuningCost(a.Exp + b.Exp, a.Tuners + b.Tuners, a.ShellCredits + b.ShellCredits);
    }
}
