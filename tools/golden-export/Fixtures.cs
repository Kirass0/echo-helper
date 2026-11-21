using EchoHelper;
using static EchoHelper.SubstatType;

namespace GoldenExport;

/// <summary>The synthetic inputs: fixed by hand, so every run exports the same cases.</summary>
internal static class Fixtures
{
    public sealed record EchoCase(string Name, string Table, (SubstatType Type, double Value)[] Substats, (double? Target, double? ErTarget)[] TargetVariants);

    public sealed record StrategyCase(string Name, (int TuneStage, UpgradeRule[] Rules)[] RuleGroups);

    // -1 to 40 in steps of 0.25; quarters are exact in binary, so the list is the same in every language.
    public static double[] TopPercentSamples() => Enumerable.Range(-4, 165).Select(i => i / 4.0).ToArray();

    public static object Describe(ValueTable table) => new
    {
        Name = table.Name,
        Weights = Enum.GetValues<SubstatType>().ToDictionary(type => type.ToString(), table.WeightOf),
    };

    public static object Describe(UpgradeRule rule) => rule switch
    {
        MustHaveRule r => new { Kind = UpgradeRuleType.MustHave, r.SubstatCount, r.SubstatTypes },
        StatValueRule r => new { Kind = UpgradeRuleType.StatValue, r.SubstatType, r.MinValue },
        MinEchoValueRule r => new { Kind = UpgradeRuleType.MinEchoValue, r.MinEchoValue },
        ChanceRule r => (object)new { Kind = UpgradeRuleType.Chance, r.MinChancePercent, r.TargetValue },
        _ => throw new ArgumentOutOfRangeException(nameof(rule)),
    };

    // Each Echo is evaluated at every Tune Stage: its first N Substats, in the order listed. Every value is a real roll.
    public static EchoCase[] EvaluationEchoes()
    {
        (double?, double?)[] Variants(double target, double erTarget) => [(null, null), (target, erTarget)];
        return
        [
            new("Mornye, Flat DEF first", "Mornye",
                [(Def_Flat, 50), (Liberation, 9.4), (Critical_Damage, 16.2), (Def_Percent, 11.8), (Energy_Regen, 10)],
                Variants(10, 8)),
            new("Mornye, flat Substats", "Mornye",
                [(Critical_Rate, 8.1), (Atk_Flat, 40), (Def_Flat, 70), (Hp_Flat, 430), (Critical_Damage, 21)],
                Variants(12.5, 6)),
            new("Cantarella, crit", "Cantarella",
                [(Critical_Rate, 9.3), (Atk_Percent, 8.6), (Critical_Damage, 13.8), (Basic_Attack, 10.1), (Atk_Flat, 30)],
                Variants(15, 12)),
            new("Shorekeeper, Energy Regen first", "Shorekeeper",
                [(Energy_Regen, 12.4), (Hp_Percent, 10.9), (Critical_Damage, 18.6), (Liberation, 7.9), (Def_Percent, 9)],
                Variants(14, 11)),
            new("Hsin (Unison), Energy Regen last", "Hsin (Unison)",
                [(Critical_Damage, 19.8), (Skill, 8.6), (Critical_Rate, 6.9), (Atk_Percent, 11.6), (Energy_Regen, 6.8)],
                Variants(12.7, 10)),
            // Sigrika is the only table with an Energy Regen weight (2.23).
            new("Sigrika, weighted Energy Regen", "Sigrika",
                [(Def_Flat, 40), (Energy_Regen, 9.2), (Heavy, 6.4), (Hp_Flat, 320), (Atk_Flat, 60)],
                Variants(8, 6)),
        ];
    }

    public static readonly string[] StrategyTables = ["Cartethyia", "Mornye", "Cantarella", "Shorekeeper", "Hsin (Unison)"];

    public static StrategyCase[] Strategies() =>
    [
        // Transcribed from the owner's %AppData%\EchoHelper\settings.json (4 rules, saved for Cartethyia).
        new("Owner's saved strategy",
        [
            (2, [UpgradeRule.Chance(1, 12.7)]),
            (3, [UpgradeRule.Chance(1, 12.7)]),
            (4, [UpgradeRule.Chance(1, 12.7)]),
            (5, [UpgradeRule.MinEchoValue(12.7)]),
        ]),
        new("Empty strategy", []),
        new("Substat Count",
        [
            (1, [UpgradeRule.MustHave(1, Critical_Rate, Critical_Damage)]),
            (3, [UpgradeRule.MustHave(2, Critical_Rate, Critical_Damage, Atk_Percent, Hp_Percent, Def_Percent)]),
        ]),
        new("Several Rule Groups at one stage",
        [
            (2, [UpgradeRule.StatValue(Critical_Rate, 8.1)]),
            (2, [UpgradeRule.StatValue(Critical_Damage, 16.2)]),
            (2, [UpgradeRule.MustHave(2, Critical_Rate, Critical_Damage)]),
            (4, [UpgradeRule.MinEchoValue(8)]),
            (4, [UpgradeRule.MustHave(1, Energy_Regen), UpgradeRule.MinEchoValue(5)]),
        ]),
        // Critical Rate never rolls above 10.5, so every Echo is discarded at 3/5.
        new("Impossible rule",
        [
            (1, [UpgradeRule.MustHave(1, Critical_Rate, Critical_Damage, Liberation)]),
            (3, [UpgradeRule.StatValue(Critical_Rate, 11)]),
        ]),
        // Three Substats can't be on a 2/5 Echo, so only the second Rule Group can pass.
        new("Impossible Rule Group beside a possible one",
        [
            (2, [UpgradeRule.MustHave(3, Critical_Rate, Critical_Damage, Energy_Regen)]),
            (2, [UpgradeRule.MinEchoValue(3)]),
        ]),
        new("Substat Roll on flat and Energy Regen values",
        [
            (1, [UpgradeRule.StatValue(Atk_Flat, 50)]),
            (1, [UpgradeRule.StatValue(Def_Flat, 60)]),
            (1, [UpgradeRule.StatValue(Hp_Flat, 470)]),
            (1, [UpgradeRule.StatValue(Energy_Regen, 10)]),
            (1, [UpgradeRule.MustHave(1, Critical_Rate, Critical_Damage)]),
            (3, [UpgradeRule.Chance(10, 12)]),
            (5, [UpgradeRule.MinEchoValue(10)]),
        ]),
        new("Target Chance from the first stage",
        [
            (1, [UpgradeRule.Chance(5, 14)]),
            (3, [UpgradeRule.Chance(20, 14), UpgradeRule.StatValue(Critical_Damage, 15)]),
            (3, [UpgradeRule.MinEchoValue(9)]),
            (5, [UpgradeRule.MinEchoValue(14)]),
        ]),
    ];
}
