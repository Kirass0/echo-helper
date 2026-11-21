using System.Runtime.InteropServices;

namespace EchoHelper
{
    /// <summary>
    /// The exact distribution of fully tuned Echo Values for a Value Table. Every set of Substat types is equally likely
    /// and each value is rolled independently, so every fully tuned Echo is counted rather than simulated.
    /// </summary>
    public sealed class EchoValueDistribution
    {
        // Echo Values this close are equal, so floating-point summation order never decides a tie.
        private const double tolerance = 1e-9;

        // Ascending Echo Values, and for each the chance of one at or above it, overall and with Energy Regen; each has a trailing 0.
        private readonly double[] echoValues;
        private readonly double[] chanceAtOrAbove;
        private readonly double[] chanceWithErAtOrAbove;

        private EchoValueDistribution(double[] echoValues, double[] chanceAtOrAbove, double[] chanceWithErAtOrAbove)
        {
            this.echoValues = echoValues;
            this.chanceAtOrAbove = chanceAtOrAbove;
            this.chanceWithErAtOrAbove = chanceWithErAtOrAbove;
        }

        public static EchoValueDistribution Of(ValueTable valueTable)
        {
            // bySize[k] maps an Echo Value to its chance summed over every set of k of the Substat types added so far.
            var bySize = new Dictionary<double, double>[Echo.MaxTuneStage + 1];
            bySize[0] = new() { { 0.0, 1.0 } };
            for (int size = 1; size <= Echo.MaxTuneStage; size++)
                bySize[size] = new();

            // Energy Regen comes last, so every set with it is a set of the other types one short, plus an Energy Regen roll.
            var types = Enum.GetValues<SubstatType>().Where(type => type != SubstatType.Energy_Regen).Append(SubstatType.Energy_Regen);
            var withEr = new Dictionary<double, double>();
            foreach (var type in types)
            {
                var rolls = Echo.EchoValueRolls(type, valueTable);
                if (type == SubstatType.Energy_Regen)
                {
                    foreach (var (echoValue, chance) in bySize[Echo.MaxTuneStage - 1])
                    {
                        foreach (var roll in rolls)
                            CollectionsMarshal.GetValueRefOrAddDefault(withEr, echoValue + roll.EchoValue, out _) += chance * roll.Chance;
                    }
                }
                for (int size = Echo.MaxTuneStage; size >= 1; size--)
                {
                    var larger = bySize[size];
                    foreach (var (echoValue, chance) in bySize[size - 1])
                    {
                        foreach (var roll in rolls)
                            CollectionsMarshal.GetValueRefOrAddDefault(larger, echoValue + roll.EchoValue, out _) += chance * roll.Chance;
                    }
                }
            }

            var fullyTuned = bySize[Echo.MaxTuneStage];
            var echoValues = fullyTuned.Keys.ToArray();
            var chances = fullyTuned.Values.ToArray();
            Array.Sort(echoValues, chances);

            // Each set of Substat types is equally likely, so the summed chances are divided by the number of sets.
            double setCount = chances.Sum();
            // Those with Energy Regen were summed the same way, so their Echo Values are among the keys exactly.
            var chanceAtOrAbove = new double[echoValues.Length + 1];
            var chanceWithErAtOrAbove = new double[echoValues.Length + 1];
            for (int i = echoValues.Length - 1; i >= 0; i--)
            {
                chanceAtOrAbove[i] = chanceAtOrAbove[i + 1] + chances[i] / setCount;
                chanceWithErAtOrAbove[i] = chanceWithErAtOrAbove[i + 1] + withEr.GetValueOrDefault(echoValues[i]) / setCount;
            }
            return new EchoValueDistribution(echoValues, chanceAtOrAbove, chanceWithErAtOrAbove);
        }

        /// <summary>The Top Percent of an Echo Value: the share of fully tuned Echoes with a strictly higher one, in [0, 1].</summary>
        public double TopPercent(double echoValue) => Math.Clamp(chanceAtOrAbove[FirstHigher(echoValue)], 0.0, 1.0);

        /// <summary>
        /// The ER Top Percent of an Echo Value: the share of fully tuned Echoes with an Energy Regen Substat and a strictly
        /// higher one, in [0, 1].
        /// </summary>
        public double ErTopPercent(double echoValue) => Math.Clamp(chanceWithErAtOrAbove[FirstHigher(echoValue)], 0.0, 1.0);

        private int FirstHigher(double echoValue)
        {
            int index = Array.BinarySearch(echoValues, echoValue + tolerance);
            return index >= 0 ? index + 1 : ~index;
        }
    }
}
