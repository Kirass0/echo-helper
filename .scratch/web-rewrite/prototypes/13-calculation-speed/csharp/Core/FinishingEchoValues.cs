using System.Runtime.InteropServices;

namespace EchoHelper
{
    /// <summary>
    /// The exact chance of each Echo Value a partly tuned Echo can finish with once fully tuned, split by whether it then has Energy Regen.
    /// The Substat types still to come are a uniform pick from those the Echo doesn't have, and each value is rolled independently,
    /// so every way to finish is counted rather than simulated.
    /// </summary>
    public sealed class FinishingEchoValues
    {
        // Echo Values this close are equal, so floating-point summation order never decides a threshold.
        private const double tolerance = 1e-9;

        // Ascending Echo Values, and for each the chance of finishing at or above it; both chance arrays have a trailing 0.
        private readonly double[] echoValues;
        private readonly double[] chanceAtOrAbove;
        private readonly double[] chanceWithErAtOrAbove;

        private FinishingEchoValues(IReadOnlyList<FinishingEchoValue> outcomes)
        {
            Outcomes = outcomes;
            echoValues = outcomes.Select(outcome => outcome.EchoValue).ToArray();
            chanceAtOrAbove = new double[outcomes.Count + 1];
            chanceWithErAtOrAbove = new double[outcomes.Count + 1];
            for (int i = outcomes.Count - 1; i >= 0; i--)
            {
                chanceAtOrAbove[i] = chanceAtOrAbove[i + 1] + outcomes[i].Chance;
                chanceWithErAtOrAbove[i] = chanceWithErAtOrAbove[i + 1] + outcomes[i].ChanceWithEr;
            }
        }

        /// <summary>Every Echo Value the Echo can finish with, ascending; each has a chance above 0, and the chances sum to 1.</summary>
        public IReadOnlyList<FinishingEchoValue> Outcomes { get; }

        public static FinishingEchoValues Of(Echo echo, ValueTable valueTable) =>
            Of(echo.Substats.Keys, echo.GetEchoValue(valueTable), valueTable);

        // For an Echo with these Substat types and Echo Value; its values only matter through the Echo Value.
        internal static FinishingEchoValues Of(IReadOnlyCollection<SubstatType> types, double currentEchoValue, ValueTable valueTable)
        {
            int toAdd = Echo.MaxTuneStage - types.Count;
            // bySize[k] maps an added Echo Value to its chances, with and without Energy Regen added, summed over every set of k of the missing types added so far.
            var bySize = new Dictionary<double, ErSplit>[toAdd + 1];
            bySize[0] = new() { { 0.0, new ErSplit(0, 1) } };
            for (int size = 1; size <= toAdd; size++)
                bySize[size] = new();

            foreach (var type in Enum.GetValues<SubstatType>().Where(type => !types.Contains(type)))
            {
                var rolls = Echo.EchoValueRolls(type, valueTable);
                bool isEr = type == SubstatType.Energy_Regen;
                for (int size = toAdd; size >= 1; size--)
                {
                    var larger = bySize[size];
                    foreach (var (echoValue, split) in bySize[size - 1])
                    {
                        var added = isEr ? new ErSplit(split.WithEr + split.WithoutEr, 0) : split;
                        foreach (var roll in rolls)
                        {
                            ref var chances = ref CollectionsMarshal.GetValueRefOrAddDefault(larger, echoValue + roll.EchoValue, out _);
                            chances = new ErSplit(chances.WithEr + added.WithEr * roll.Chance, chances.WithoutEr + added.WithoutEr * roll.Chance);
                        }
                    }
                }
            }

            // Each set of missing types is equally likely, so the summed chances are divided by the number of sets.
            var finished = bySize[toAdd];
            double setCount = finished.Values.Sum(split => split.WithEr + split.WithoutEr);
            bool hasEr = types.Contains(SubstatType.Energy_Regen);
            var outcomes = finished
                .Select(entry => new FinishingEchoValue(
                    currentEchoValue + entry.Key,
                    ChanceWithEr: (hasEr ? entry.Value.WithEr + entry.Value.WithoutEr : entry.Value.WithEr) / setCount,
                    ChanceWithoutEr: (hasEr ? 0 : entry.Value.WithoutEr) / setCount))
                .OrderBy(outcome => outcome.EchoValue)
                .ToList();
            return new FinishingEchoValues(outcomes.AsReadOnly());
        }

        /// <summary>The chance of finishing at or above an Echo Value, in [0, 1].</summary>
        public double ChanceAtOrAbove(double echoValue) => ChanceAtOrAbove(echoValue, chanceAtOrAbove);

        /// <summary>The chance of finishing with Energy Regen and at or above an Echo Value, in [0, 1].</summary>
        public double ChanceWithErAtOrAbove(double echoValue) => ChanceAtOrAbove(echoValue, chanceWithErAtOrAbove);

        private double ChanceAtOrAbove(double echoValue, double[] chances)
        {
            int index = Array.BinarySearch(echoValues, echoValue - tolerance);
            return Math.Clamp(chances[index >= 0 ? index : ~index], 0.0, 1.0);
        }
    }

    // Chances summed while the table is built, split by whether Energy Regen was added.
    internal readonly record struct ErSplit(double WithEr, double WithoutEr);

    /// <summary>An Echo Value an Echo can finish with, and the chances, in [0, 1], of finishing there with and without Energy Regen.</summary>
    public readonly record struct FinishingEchoValue(double EchoValue, double ChanceWithEr, double ChanceWithoutEr)
    {
        public double Chance => ChanceWithEr + ChanceWithoutEr;
    }
}
