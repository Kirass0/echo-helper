namespace EchoHelper
{
    public class Echo
    {
        private readonly static Dictionary<SubstatType, double> medianSubstatRolls = new Dictionary<SubstatType, double>()
        {
            {SubstatType.Atk_Percent, 8.6},
            {SubstatType.Atk_Flat, 40},
            {SubstatType.Def_Percent, 10.9},
            {SubstatType.Def_Flat, 50},
            {SubstatType.Hp_Percent, 8.6},
            {SubstatType.Hp_Flat, 430},
            {SubstatType.Basic_Attack, 8.6},
            {SubstatType.Skill, 8.6},
            {SubstatType.Heavy, 8.6},
            {SubstatType.Liberation, 8.6},
            {SubstatType.Energy_Regen, 9.2},
            {SubstatType.Critical_Rate, 7.5},
            {SubstatType.Critical_Damage, 15},
        };
        private readonly static int[] valueChanceArray = { 680, 777, 2039, 2428, 1748, 1457, 582, 291 };
        private readonly static int[] valueCritChanceArray = { 2333, 2333, 2333, 800, 800, 800, 300, 300 };
        private readonly static Dictionary<SubstatType, double[]> substatsValuesTable = new Dictionary<SubstatType, double[]>()
        {
            {SubstatType.Critical_Rate, [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5] },
            {SubstatType.Critical_Damage, [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21] },
            {SubstatType.Hp_Flat, [320, 360, 390, 430, 470, 510, 540, 580] },
            {SubstatType.Def_Percent, [8.1, 9, 10, 10.9, 11.8, 12.8, 13.8, 14.7] },
            {SubstatType.Energy_Regen, [6.8, 7.6, 8.4, 9.2, 10, 10.8, 11.6, 12.4] },
            {SubstatType.Atk_Flat, [30, 30, 40, 40, 50, 50, 60, 60] },
            {SubstatType.Def_Flat, [40, 40, 50, 50, 60, 60, 70, 70] },
            {SubstatType.Atk_Percent, [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6] },
            {SubstatType.Hp_Percent, [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6] },
            {SubstatType.Liberation, [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6] },
            {SubstatType.Skill, [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6] },
            {SubstatType.Heavy, [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6] },
            {SubstatType.Basic_Attack, [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6] }
        };

        // Built from the tiers RollSubstatValue rolls with, so the exact calculations and the test oracles can't disagree.
        private readonly static Dictionary<SubstatType, IReadOnlyList<PossibleRoll>> possibleRolls = Enum.GetValues<SubstatType>().ToDictionary(type => type, type =>
        {
            var weights = TierWeights(type);
            return (IReadOnlyList<PossibleRoll>)substatsValuesTable[type]
                .Select((value, tier) => (value, tier))
                .GroupBy(roll => roll.value, roll => weights[roll.tier])
                .Select(group => new PossibleRoll(group.Key, (double)group.Sum() / weights.Sum()))
                .ToList()
                .AsReadOnly();
        });

        public const int MaxTuneStage = 5;

        public int TuneStage => Substats.Count;
        public Dictionary<SubstatType, double> Substats { get; private set; } = new();

        // Distinct values in ascending order; flat Substats repeat values across roll tiers, and those tiers are merged.
        public static IReadOnlyList<PossibleRoll> GetPossibleRolls(SubstatType type) => possibleRolls[type];

        public static IReadOnlyList<double> GetPossibleValues(SubstatType type) => GetPossibleRolls(type).Select(roll => roll.Value).ToList();

        public void Tune(Random random, int times = 1)
        {
            for (int i = 0; i < times; i++)
            {
                ThrowIfFullyTuned();
                SubstatType type = RollSubstatType(random);
                double value = RollSubstatValue(type, random);
                Substats.Add(type, value);
            }
        }

        public void TuneToMax(Random random)
        {
            while (TuneStage < MaxTuneStage)
                Tune(random);
        }

        public void AddSubstat(SubstatType type, double value)
        {
            ThrowIfFullyTuned();
            Substats.Add(type, value);
        }

        private void ThrowIfFullyTuned()
        {
            if (TuneStage >= MaxTuneStage)
                throw new InvalidOperationException($"Echo cannot be tuned beyond Tune Stage {MaxTuneStage}.");
        }

        public double GetEchoValue(ValueTable valueTable)
        {
            double value = 0.0;
            foreach (var substat in this.Substats)
            {
                value += EchoValueOf(substat.Key, substat.Value, valueTable);
            }
            return value;
        }

        // What one Substat adds to the Echo Value.
        internal static double EchoValueOf(SubstatType type, double value, ValueTable valueTable) =>
            valueTable.WeightOf(type) * (value / medianSubstatRolls[type]);

        // What each roll of a Substat type adds to the Echo Value, with its chance; merged by Echo Value, so a type weighted 0 adds a single roll.
        internal static (double EchoValue, double Chance)[] EchoValueRolls(SubstatType type, ValueTable valueTable) =>
            GetPossibleRolls(type)
                .GroupBy(roll => EchoValueOf(type, roll.Value, valueTable), roll => roll.Chance)
                .Select(group => (EchoValue: group.Key, Chance: group.Sum()))
                .ToArray();

        public Echo Clone()
        {
            var echo = (Echo)MemberwiseClone();
            echo.Substats = new Dictionary<SubstatType, double>(this.Substats);
            return echo;
        }

        private SubstatType RollSubstatType(Random random)
        {
            var unused = Enum.GetValues<SubstatType>().Where(type => !Substats.ContainsKey(type)).ToArray();
            return unused[random.Next(unused.Length)];
        }

        private static double RollSubstatValue(SubstatType type, Random random)
        {
            var weights = TierWeights(type);
            int roll = random.Next(weights.Sum());
            for (int tier = 0; ; tier++)
            {
                roll -= weights[tier];
                if (roll < 0)
                    return substatsValuesTable[type][tier];
            }
        }

        private static int[] TierWeights(SubstatType type) =>
            type is SubstatType.Critical_Rate or SubstatType.Critical_Damage ? valueCritChanceArray : valueChanceArray;
    }

    /// <summary>A value a Substat type can roll, and the chance of rolling it, in [0, 1].</summary>
    public readonly record struct PossibleRoll(double Value, double Chance);

    public enum SubstatType
    {
        Atk_Percent,
        Atk_Flat,
        Def_Percent,
        Def_Flat,
        Hp_Percent,
        Hp_Flat,
        Basic_Attack,
        Skill,
        Heavy,
        Liberation,
        Energy_Regen,
        Critical_Rate,
        Critical_Damage
    }
}
