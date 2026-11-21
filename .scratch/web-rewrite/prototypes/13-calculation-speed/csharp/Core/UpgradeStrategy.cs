using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EchoHelper
{
    public class UpgradeStrategy
    {
        private readonly List<IReadOnlyList<UpgradeRule>>[] ruleGroups = Enumerable.Range(0, Echo.MaxTuneStage).Select(_ => new List<IReadOnlyList<UpgradeRule>>()).ToArray();

        // An Echo passes a Tune Stage when every rule of any one of its Rule Groups passes.
        public void AddRuleGroup(int tuneStage, params IReadOnlyList<UpgradeRule> rules)
        {
            var ruleGroupsAtStage = EditableRuleGroupsAt(tuneStage);
            if (rules.Count == 0)
                throw new ArgumentException("A Rule Group needs at least one Upgrade Rule", nameof(rules));

            ruleGroupsAtStage.Add(rules.ToArray());
        }

        // Empty for a Tune Stage without rules; every Rule Group has at least one rule.
        public IReadOnlyList<IReadOnlyList<UpgradeRule>> RuleGroupsAt(int tuneStage) => EditableRuleGroupsAt(tuneStage);

        private List<IReadOnlyList<UpgradeRule>> EditableRuleGroupsAt(int tuneStage)
        {
            if (tuneStage < 1 || tuneStage > Echo.MaxTuneStage)
                throw new ArgumentOutOfRangeException(nameof(tuneStage), $"tuneStage has to be between 1 and {Echo.MaxTuneStage}");

            return ruleGroups[tuneStage - 1];
        }
    }

    // Core accepts any rule; one that can never pass discards every Echo at its Tune Stage (ADR 0001).
    public abstract record UpgradeRule
    {
        // Values this close to a threshold reach it, so floating-point summation order never decides a rule.
        private protected const double tolerance = 1e-9;

        private protected UpgradeRule() { }

        internal abstract bool Passes(TunedEcho echo, UpgradeRuleContext context);

        public static UpgradeRule MustHave(int substatCount, params List<SubstatType> substatTypes) => new MustHaveRule(substatCount, substatTypes);

        public static UpgradeRule StatValue(SubstatType substatType, double minValue) => new StatValueRule(substatType, minValue);

        public static UpgradeRule MinEchoValue(double minEchoValue) => new MinEchoValueRule(minEchoValue);

        public static UpgradeRule Chance(double minChancePercent, double targetValue) => new ChanceRule(minChancePercent, targetValue);
    }

    // At least substatCount of the given Substat types are on the Echo
    public sealed record MustHaveRule(int SubstatCount, IReadOnlyList<SubstatType> SubstatTypes) : UpgradeRule
    {
        internal override bool Passes(TunedEcho echo, UpgradeRuleContext context) => SubstatTypes.Count(echo.Has) >= SubstatCount;
    }

    // The given Substat is on the Echo with a value of at least minValue
    public sealed record StatValueRule(SubstatType SubstatType, double MinValue) : UpgradeRule
    {
        internal override bool Passes(TunedEcho echo, UpgradeRuleContext context) => context.ValueOf(echo, SubstatType) >= MinValue - tolerance;
    }

    // The Echo Value is at least minEchoValue
    public sealed record MinEchoValueRule(double MinEchoValue) : UpgradeRule
    {
        // Hides the factory of the same name, which is static on UpgradeRule.
        public new double MinEchoValue { get; init; } = MinEchoValue;

        internal override bool Passes(TunedEcho echo, UpgradeRuleContext context) => echo.EchoValue >= MinEchoValue - tolerance;
    }

    // The chance of the fully tuned Echo reaching targetValue is at least minChancePercent
    public sealed record ChanceRule(double MinChancePercent, double TargetValue) : UpgradeRule
    {
        internal override bool Passes(TunedEcho echo, UpgradeRuleContext context) => context.ChanceToReach(echo, TargetValue) >= MinChancePercent / 100 - tolerance;
    }

    public enum UpgradeRuleType
    {
        MustHave,
        StatValue,
        MinEchoValue,
        Chance
    }
}
