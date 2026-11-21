using System.Numerics;
using System.Runtime.InteropServices;

namespace EchoHelper
{
    /// <summary>
    /// Calculates an Upgrade Strategy exactly by going forward one Tune Stage at a time, keeping the chance of every distinct still-kept state.
    /// Upgrade Rules don't see the order Substats arrived in, so a state is the Substat types, the Echo Value and the values StatValue rules name,
    /// and each part is kept only while a rule at a later Tune Stage still reads it.
    /// </summary>
    internal static class UpgradeStrategyPass
    {
        // Echo Values are kept to this many decimals, so states that only differ by summation order are merged.
        private const int echoValueDecimals = 12;

        private static readonly SubstatType[] substatTypes = Enum.GetValues<SubstatType>();

        public static UpgradeStrategyResult Calculate(UpgradeStrategy strategy, ValueTable valueTable, IProgress<double>? progress, CancellationToken cancellationToken)
        {
            int lastRuleStage = Enumerable.Range(1, Echo.MaxTuneStage).LastOrDefault(tuneStage => strategy.RuleGroupsAt(tuneStage).Count > 0);
            var context = new UpgradeRuleContext(valueTable, strategy);
            var states = new Dictionary<TunedEcho, StateChance> { { new TunedEcho(0, 0, 0), new StateChance(1, 0, 0) } };
            double[] discardRates = new double[Echo.MaxTuneStage + 1];

            for (int tuneStage = 1; tuneStage <= lastRuleStage; tuneStage++)
            {
                var ruleGroups = strategy.RuleGroupsAt(tuneStage);
                bool keepsEchoValue = context.EchoValueReadFrom(tuneStage + 1);
                ulong keptRolls = context.RollsReadFrom(tuneStage + 1);
                double typeChance = 1.0 / (substatTypes.Length - tuneStage + 1);
                var next = new Dictionary<TunedEcho, StateChance>();
                if (ruleGroups.Any(rules => rules.Any(rule => rule is ChanceRule)))
                    context.PrepareChances(states.Keys.SelectMany(echo => substatTypes.Where(type => !echo.Has(type)).Select(type => echo.Types | TunedEcho.Bit(type))), cancellationToken);

                foreach (var (echo, state) in states)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    foreach (var type in substatTypes)
                    {
                        if (echo.Has(type))
                            continue;
                        foreach (var roll in context.RollsAt(tuneStage, type))
                        {
                            var tuned = new TunedEcho(echo.Types | TunedEcho.Bit(type), echo.EchoValue + roll.EchoValue, echo.Rolls | roll.Bits);
                            double chance = typeChance * roll.Chance;
                            if (!PassesAnyRuleGroup(ruleGroups, tuned, context))
                            {
                                discardRates[tuneStage] += state.Chance * chance;
                                continue;
                            }

                            var kept = new TunedEcho(tuned.Types, keepsEchoValue ? Math.Round(tuned.EchoValue, echoValueDecimals) : 0, tuned.Rolls & keptRolls);
                            var added = new StateChance(state.Chance * chance, (state.EchoValueSum + state.Chance * roll.EchoValue) * chance, state.MinEchoValue + roll.EchoValue);
                            ref var merged = ref CollectionsMarshal.GetValueRefOrAddDefault(next, kept, out bool exists);
                            merged = exists ? merged.MergedWith(added) : added;
                        }
                    }
                }

                states = next;
                progress?.Report((double)tuneStage / Echo.MaxTuneStage);
            }

            // No rule reads the Tune Stages after the last one with rules, so every state left is kept, and finishes with any of the missing types.
            cancellationToken.ThrowIfCancellationRequested();
            double keptRate = 0;
            double keptEchoValueSum = 0;
            double keptEchoValueMin = double.MaxValue;
            foreach (var (echo, state) in states)
            {
                var (averageAdded, minAdded) = context.EchoValueAddedToFinish(echo.Types);
                keptRate += state.Chance;
                keptEchoValueSum += state.EchoValueSum + state.Chance * averageAdded;
                keptEchoValueMin = Math.Min(keptEchoValueMin, state.MinEchoValue + minAdded);
            }
            if (lastRuleStage < Echo.MaxTuneStage)
                progress?.Report(1);

            bool anyKept = states.Count > 0;
            keptRate = Math.Clamp(keptRate, 0.0, 1.0);
            return new UpgradeStrategyResult(
                keptRate,
                anyKept ? AverageCostPerKeptEcho(discardRates, keptRate) : null,
                Enumerable.Range(1, Echo.MaxTuneStage).Select(tuneStage => new TuneStageDiscards(tuneStage, Math.Clamp(discardRates[tuneStage], 0.0, 1.0))).ToList(),
                AverageKeptEchoValue: anyKept ? keptEchoValueSum / keptRate : null,
                MinimumKeptEchoValue: anyKept ? keptEchoValueMin : null);
        }

        // A Tune Stage without Rule Groups lets every Echo through.
        private static bool PassesAnyRuleGroup(IReadOnlyList<IReadOnlyList<UpgradeRule>> ruleGroups, TunedEcho echo, UpgradeRuleContext context)
        {
            if (ruleGroups.Count == 0)
                return true;
            for (int i = 0; i < ruleGroups.Count; i++)
            {
                if (PassesAll(ruleGroups[i], echo, context))
                    return true;
            }
            return false;
        }

        private static bool PassesAll(IReadOnlyList<UpgradeRule> rules, TunedEcho echo, UpgradeRuleContext context)
        {
            for (int i = 0; i < rules.Count; i++)
            {
                if (!rules[i].Passes(echo, context))
                    return false;
            }
            return true;
        }

        // The expected Tuning Cost per tuned Echo, divided by the share kept.
        private static AverageCost AverageCostPerKeptEcho(double[] discardRates, double keptRate)
        {
            double exp = 0, tuners = 0, shellCredits = 0;
            void Add(TuningCost cost, double rate)
            {
                exp += cost.Exp * rate;
                tuners += cost.Tuners * rate;
                shellCredits += cost.ShellCredits * rate;
            }
            for (int tuneStage = 1; tuneStage <= Echo.MaxTuneStage; tuneStage++)
                Add(TuningCost.Of(tuneStage, discarded: true), discardRates[tuneStage]);
            Add(TuningCost.Of(Echo.MaxTuneStage, discarded: false), keptRate);
            return new AverageCost(1 / keptRate, exp / keptRate, tuners / keptRate, shellCredits / keptRate);
        }

        // A state's chance, its chance-weighted sum of Echo Values, and the lowest Echo Value merged into it.
        private readonly record struct StateChance(double Chance, double EchoValueSum, double MinEchoValue)
        {
            public StateChance MergedWith(StateChance other) =>
                new(Chance + other.Chance, EchoValueSum + other.EchoValueSum, Math.Min(MinEchoValue, other.MinEchoValue));
        }
    }

    /// <summary>
    /// What Upgrade Rules read of an Echo during the forward pass: its Substat types as bits, its Echo Value,
    /// and, four bits per Substat type a StatValue rule names, the index of its roll plus one.
    /// </summary>
    internal readonly record struct TunedEcho(int Types, double EchoValue, ulong Rolls)
    {
        public static int Bit(SubstatType type) => 1 << (int)type;

        public bool Has(SubstatType type) => (Types & Bit(type)) != 0;
    }

    /// <summary>A roll in the forward pass: what it adds to the Echo Value, its chance, and its bits in <see cref="TunedEcho.Rolls"/>.</summary>
    internal readonly record struct PassRoll(double EchoValue, double Chance, ulong Bits);

    /// <summary>What the rules of one Upgrade Strategy read besides the Echo, and which parts of it they read from each Tune Stage on.</summary>
    internal sealed class UpgradeRuleContext
    {
        public static bool Sequential;
        private const int bitsPerRoll = 4;

        private readonly ValueTable valueTable;
        // The slot of each Substat type a StatValue rule names in TunedEcho.Rolls, or -1.
        private readonly int[] rollSlots;
        // Indexed by Tune Stage, with an extra entry past the last: what rules at that Tune Stage or later read.
        private readonly bool[] echoValueReadFrom = new bool[Echo.MaxTuneStage + 2];
        private readonly ulong[] rollsReadFrom = new ulong[Echo.MaxTuneStage + 2];
        // Indexed by Tune Stage, then Substat type.
        private readonly PassRoll[][][] rollsAt;
        private readonly Dictionary<int, FinishingEchoValues> finishingByTypes = new();
        private readonly Dictionary<int, (double Average, double Min)> addedToFinishByTypes = new();

        public UpgradeRuleContext(ValueTable valueTable, UpgradeStrategy strategy)
        {
            this.valueTable = valueTable;
            rollSlots = Enum.GetValues<SubstatType>().Select(_ => -1).ToArray();
            int slotCount = 0;
            for (int tuneStage = Echo.MaxTuneStage; tuneStage >= 1; tuneStage--)
            {
                echoValueReadFrom[tuneStage] = echoValueReadFrom[tuneStage + 1];
                rollsReadFrom[tuneStage] = rollsReadFrom[tuneStage + 1];
                foreach (var rule in strategy.RuleGroupsAt(tuneStage).SelectMany(rules => rules))
                {
                    if (rule is MinEchoValueRule or ChanceRule)
                        echoValueReadFrom[tuneStage] = true;
                    if (rule is StatValueRule statValue)
                    {
                        ref int slot = ref rollSlots[(int)statValue.SubstatType];
                        if (slot < 0)
                            slot = slotCount++;
                        rollsReadFrom[tuneStage] |= SlotMask(slot);
                    }
                }
            }
            rollsAt = Enumerable.Range(0, Echo.MaxTuneStage + 1)
                .Select(tuneStage => Enum.GetValues<SubstatType>().Select(type => RollsOf(type, tuneStage)).ToArray())
                .ToArray();
        }

        public bool EchoValueReadFrom(int tuneStage) => echoValueReadFrom[tuneStage];

        public ulong RollsReadFrom(int tuneStage) => rollsReadFrom[tuneStage];

        // Precomputed in the constructor, as the pass asks for them once per state and missing type.
        public PassRoll[] RollsAt(int tuneStage, SubstatType type) => rollsAt[tuneStage][(int)type];

        // Null when the Echo doesn't have the Substat type.
        public double? ValueOf(TunedEcho echo, SubstatType type)
        {
            if (!echo.Has(type))
                return null;
            int slot = rollSlots[(int)type];
            int index = (int)((echo.Rolls >> (slot * bitsPerRoll)) & SlotMask(0)) - 1;
            return Echo.GetPossibleRolls(type)[index].Value;
        }

        // Builds the tables Chance rules read for these Substat type sets, in parallel, since early Tune Stages need many slow ones.
        public void PrepareChances(IEnumerable<int> typeSets, CancellationToken cancellationToken)
        {
            int[] toBuild = typeSets.Distinct().Where(types => !finishingByTypes.ContainsKey(types)).ToArray();
            var built = new FinishingEchoValues[toBuild.Length];
            // BENCH: Sequential switches off Parallel.For so the pass can be timed on one thread.
            if (Sequential)
                for (int i = 0; i < toBuild.Length; i++) built[i] = FinishingEchoValues.Of(TypesOf(toBuild[i]), 0, valueTable);
            else
                Parallel.For(0, toBuild.Length, new ParallelOptions { CancellationToken = cancellationToken },
                    i => built[i] = FinishingEchoValues.Of(TypesOf(toBuild[i]), 0, valueTable));
            for (int i = 0; i < toBuild.Length; i++)
                finishingByTypes[toBuild[i]] = built[i];
        }

        // Reads the table PrepareChances built for the Echo's Substat types.
        public double ChanceToReach(TunedEcho echo, double targetValue) =>
            finishingByTypes[echo.Types].ChanceAtOrAbove(targetValue - echo.EchoValue);

        // What finishing an Echo with these Substat types adds to its Echo Value: on average, and at least.
        public (double Average, double Min) EchoValueAddedToFinish(int types)
        {
            if (!addedToFinishByTypes.TryGetValue(types, out var added))
                addedToFinishByTypes[types] = added = CalculateEchoValueAddedToFinish(types);
            return added;
        }

        private (double Average, double Min) CalculateEchoValueAddedToFinish(int types)
        {
            var missing = Enum.GetValues<SubstatType>().Where(type => (types & TunedEcho.Bit(type)) == 0).ToList();
            int toAdd = Echo.MaxTuneStage - BitOperations.PopCount((uint)types);
            var rolls = missing.Select(type => Echo.EchoValueRolls(type, valueTable)).ToList();
            // Each missing type is added with the same chance, toAdd of missing.Count.
            double average = (double)toAdd / missing.Count * rolls.Sum(typeRolls => typeRolls.Sum(roll => roll.EchoValue * roll.Chance));
            double min = rolls.Select(typeRolls => typeRolls.Min(roll => roll.EchoValue)).Order().Take(toAdd).Sum();
            return (average, min);
        }

        // Every distinct value when a rule at this Tune Stage or later reads it; otherwise only what it adds to the Echo Value.
        private PassRoll[] RollsOf(SubstatType type, int tuneStage)
        {
            int slot = rollSlots[(int)type];
            return slot >= 0 && (rollsReadFrom[tuneStage] & SlotMask(slot)) != 0
                ? Echo.GetPossibleRolls(type).Select((roll, index) =>
                    new PassRoll(Echo.EchoValueOf(type, roll.Value, valueTable), roll.Chance, (ulong)(index + 1) << (slot * bitsPerRoll))).ToArray()
                : Echo.EchoValueRolls(type, valueTable).Select(roll => new PassRoll(roll.EchoValue, roll.Chance, 0)).ToArray();
        }

        private static ulong SlotMask(int slot) => ((1UL << bitsPerRoll) - 1) << (slot * bitsPerRoll);

        private static List<SubstatType> TypesOf(int types) => Enum.GetValues<SubstatType>().Where(type => (types & TunedEcho.Bit(type)) != 0).ToList();
    }
}
