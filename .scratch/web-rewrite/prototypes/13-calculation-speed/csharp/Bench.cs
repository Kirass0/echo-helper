// THROWAWAY benchmark driver: the same workloads as ../bench.ts, on copies of the source Core (commit 53ce242).
using System.Diagnostics;
using System.Text.Json;
using EchoHelper;
using static EchoHelper.SubstatType;

var json = JsonSerializer.Deserialize<List<JsonTable>>(File.ReadAllText(args.Length > 0 ? args[0] : "../valueTables.json"),
    new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
var tables = json.Select(t => new ValueTable(t.Name, t.Weights.ToDictionary(kv => Enum.Parse<SubstatType>(kv.Key), kv => kv.Value))).ToList();

double Once(Action fn) { var sw = Stopwatch.StartNew(); fn(); return sw.Elapsed.TotalMilliseconds; }
// Heavy calls (over 20 ms) are timed once, after the global warm-up; light ones are repeated until minMs has passed.
double TimeIt(Action fn, double minMs)
{
    double first = Once(fn);
    if (first > 20) return first;
    int n = 0; var sw = Stopwatch.StartNew();
    do { fn(); n++; } while (sw.Elapsed.TotalMilliseconds < minMs);
    return sw.Elapsed.TotalMilliseconds / n;
}

(List<FinishingEchoValue> outcomes, double[] above) Fresh(ValueTable table)
{
    var o = FinishingEchoValues.Of(new Echo(), table).Outcomes.ToList();
    var above = new double[o.Count + 1];
    for (int i = o.Count - 1; i >= 0; i--) above[i] = above[i + 1] + o[i].Chance;
    return (o, above);
}
double TopScore(ValueTable table, double p)
{
    var (o, above) = Fresh(table);
    for (int i = 0; i < o.Count; i++) if (above[i + 1] <= p) return Math.Round(o[i].EchoValue * 10, MidpointRounding.AwayFromZero) / 10;
    return Math.Round(o[^1].EchoValue * 10, MidpointRounding.AwayFromZero) / 10;
}

List<(string Name, UpgradeStrategy Strategy)> Examples(ValueTable table)
{
    double t5 = TopScore(table, 0.05), t10 = TopScore(table, 0.10);
    var keep = new UpgradeStrategy();
    var critFirst = new UpgradeStrategy();
    critFirst.AddRuleGroup(2, UpgradeRule.MustHave(1, Critical_Rate, Critical_Damage));
    critFirst.AddRuleGroup(4, UpgradeRule.MustHave(2, Critical_Rate, Critical_Damage));
    var doubleCrit = new UpgradeStrategy();
    doubleCrit.AddRuleGroup(3, UpgradeRule.MustHave(2, Critical_Rate, Critical_Damage));
    doubleCrit.AddRuleGroup(3, UpgradeRule.StatValue(Critical_Rate, 9.3));
    doubleCrit.AddRuleGroup(3, UpgradeRule.StatValue(Critical_Damage, 18.6));
    doubleCrit.AddRuleGroup(5, UpgradeRule.MinEchoValue(t10));
    var chance = new UpgradeStrategy();
    chance.AddRuleGroup(1, UpgradeRule.Chance(5, t5));
    chance.AddRuleGroup(2, UpgradeRule.Chance(8, t5));
    chance.AddRuleGroup(3, UpgradeRule.Chance(12, t5));
    chance.AddRuleGroup(4, UpgradeRule.Chance(20, t5));
    chance.AddRuleGroup(5, UpgradeRule.MinEchoValue(t5));
    return [("Keep every Echo", keep), ("Crit first", critFirst), ("Double crit, or one great crit roll", doubleCrit), ("Chance to reach a Top 5% Echo", chance)];
}

(SubstatType, double)[] full = [(Critical_Rate, 8.1), (Critical_Damage, 16.2), (Atk_Percent, 9.4), (Liberation, 8.6)];
Echo EchoAt(int stage) { var e = new Echo(); foreach (var (t, v) in full.Take(stage)) e.AddSubstat(t, v); return e; }

object Summary(List<double> xs)
{
    var s = xs.Order().ToList();
    double R(double x) => Math.Round(x, 2);
    return new { median = R(s[s.Count / 2]), min = R(s[0]), max = R(s[^1]), total = R(s.Sum()) };
}

var output = new Dictionary<string, object>();
var first = tables[0];
var cold = new Dictionary<string, double>
{
    ["distribution"] = Once(() => EchoValueDistribution.Of(first)),
    ["evaluateFreshEcho"] = Once(() => EchoCalculator.EvaluateEcho(EchoAt(0), first, 10, 10)),
};
foreach (var (name, s) in Examples(first)) cold["strategy: " + name] = Once(() => EchoCalculator.CalculateUpgradeStrategy(s, first));
output["coldFirstTable"] = cold.ToDictionary(kv => kv.Key, kv => Math.Round(kv.Value, 2));
Console.Error.Write("cold done ");

var dist = new List<double>();
var evalByStage = Enumerable.Range(0, 5).Select(_ => new List<double>()).ToArray();
var strat = new Dictionary<string, List<double>>();
var perTable = new List<Dictionary<string, object>>();
double checksum = 0;
foreach (var table in tables)
{
    EchoValueDistribution d = null!;
    dist.Add(TimeIt(() => d = EchoValueDistribution.Of(table), 50));
    var row = new Dictionary<string, object> { ["table"] = table.Name, ["distinctScores"] = Fresh(table).outcomes.Count, ["dist"] = Math.Round(dist[^1], 1) };
    perTable.Add(row);
    double t5 = TopScore(table, 0.05);
    checksum += d.TopPercent(t5) + d.ErTopPercent(t5);
    for (int s = 0; s < 5; s++)
    {
        EchoEvaluation e = null!;
        evalByStage[s].Add(TimeIt(() => e = EchoCalculator.EvaluateEcho(EchoAt(s), table, t5, t5), 50));
        row["eval" + s] = Math.Round(evalByStage[s][^1], 1);
        checksum += e.Outlook?.ChanceToReachTarget ?? 0;
    }
    foreach (var (name, s) in Examples(table))
    {
        UpgradeStrategyResult r = null!;
        double ms = TimeIt(() => r = EchoCalculator.CalculateUpgradeStrategy(s, table), 50);
        (strat.TryGetValue(name, out var l) ? l : strat[name] = []).Add(ms);
        row[name] = Math.Round(ms, 1);
        checksum += r.SuccessRate + (r.AverageKeptEchoValue ?? 0);
        if (name.StartsWith("Chance"))
        {
            UpgradeRuleContext.Sequential = true;
            double seq = Once(() => EchoCalculator.CalculateUpgradeStrategy(s, table));
            UpgradeRuleContext.Sequential = false;
            (strat.TryGetValue(name + " [one thread]", out var l2) ? l2 : strat[name + " [one thread]"] = []).Add(seq);
            row[name + " [one thread]"] = Math.Round(seq, 1);
        }
    }
    Console.Error.Write(table.Name + " ");
}
output["tables"] = tables.Count;
output["Top Percent distribution (one table)"] = Summary(dist);
for (int s = 0; s < 5; s++) output[$"evaluateEcho at {s}/5 (one table)"] = Summary(evalByStage[s]);
foreach (var (name, xs) in strat) output[$"strategy: {name} (one table)"] = Summary(xs);
output["perTable"] = perTable;
output["checksum"] = checksum;
output["runtime"] = $"{System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription}, {Environment.ProcessorCount} logical CPUs";
Console.WriteLine(JsonSerializer.Serialize(output, new JsonSerializerOptions { WriteIndented = true }));

record JsonTable(string Name, Dictionary<string, double> Weights);
