// Exports the golden fixtures from the source C# Core. Run once, locally; see README.md.
//   dotnet run --project tools/golden-export -- [output directory] [source project directory]
using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Text.Json.Serialization;
using EchoHelper;
using GoldenExport;

const string sourceCommit = "53ce242";

string outputDirectory = Path.GetFullPath(args.Length > 0 ? args[0] : Path.Combine("tests", "fixtures", "golden"));
string sourceDirectory = Path.GetFullPath(args.Length > 1 ? args[1]
    : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "source", "repos", "EchoHelperClaude"));

// The Core is compiled from the source's working tree, so it must match the commit; the tables are read from the commit itself.
string fullCommit = Git(sourceDirectory, "rev-parse", sourceCommit + "^{commit}").Trim();
if (Run(sourceDirectory, "git", "diff", "--quiet", fullCommit, "--", "EchoHelper.Core").ExitCode != 0)
    throw new InvalidOperationException($"EchoHelper.Core in {sourceDirectory} differs from {sourceCommit}; check that commit out first.");
string tablesPath = Path.Combine(Path.GetTempPath(), $"golden-export-valueTables-{fullCommit}.json");
File.WriteAllText(tablesPath, Git(sourceDirectory, "show", fullCommit + ":data/valueTables.json"));
if (!ValueTableFile.TryLoad(tablesPath, out var tables, out var problem))
    throw new InvalidOperationException($"data/valueTables.json at {sourceCommit}: {problem}");
File.Delete(tablesPath);
if (tables.Count != 28)
    throw new InvalidOperationException($"Expected the 28 Value Tables of {sourceCommit}, found {tables.Count}.");

var source = new
{
    Repository = "EchoHelperClaude",
    Commit = fullCommit,
    ValueTablesFile = "data/valueTables.json",
    Note = "Exported once from the C# Core. Matches only the game data of 2026-11-16 (the 28 tables at this commit).",
};
var byName = tables.ToDictionary(table => table.Name);
var options = new JsonSerializerOptions
{
    WriteIndented = true,
    Converters = { new JsonStringEnumConverter() },
};
Directory.CreateDirectory(outputDirectory);
void Write(string name, object fixture)
{
    string path = Path.Combine(outputDirectory, name);
    // Objects holding only scalars (distribution points, Substats, weights) go on one line, to keep the files small.
    string json = Regex.Replace(JsonSerializer.Serialize(fixture, options), @"\{[^{}\[\]]*\}", match => Regex.Replace(match.Value, @"\s*\n\s*", " "));
    File.WriteAllText(path, json + "\n");
    Console.WriteLine($"{path}: {new FileInfo(path).Length / 1024.0:F0} KB");
}

// 1. Top Percent: the whole-table distribution of every table, sampled at a fixed list of Echo Values.
var sampleEchoValues = Fixtures.TopPercentSamples();
Write("top-percent.json", new
{
    Source = source,
    SampleEchoValues = sampleEchoValues,
    Tables = tables.Select(table =>
    {
        var distribution = EchoValueDistribution.Of(table);
        return new
        {
            ValueTable = Fixtures.Describe(table),
            Points = sampleEchoValues.Select(echoValue => new
            {
                EchoValue = echoValue,
                TopPercent = distribution.TopPercent(echoValue),
                ErTopPercent = distribution.ErTopPercent(echoValue),
            }).ToList(),
        };
    }).ToList(),
});

// 2. Echo Evaluation: each synthetic Echo at every Tune Stage 0-5, under each target variant.
var evaluationCases = new List<object>();
foreach (var echoCase in Fixtures.EvaluationEchoes())
{
    var table = byName[echoCase.Table];
    var distribution = EchoValueDistribution.Of(table);
    for (int tuneStage = 0; tuneStage <= Echo.MaxTuneStage; tuneStage++)
    {
        var echo = new Echo();
        foreach (var (type, value) in echoCase.Substats.Take(tuneStage))
            echo.AddSubstat(type, value);
        double echoValue = echo.GetEchoValue(table);
        foreach (var (targetValue, erTargetValue) in echoCase.TargetVariants)
        {
            evaluationCases.Add(new
            {
                Name = $"{echoCase.Name} at {tuneStage}/5, target {targetValue?.ToString() ?? "none"}, ER target {erTargetValue?.ToString() ?? "none"}",
                ValueTableName = table.Name,
                TuneStage = tuneStage,
                Substats = echo.Substats.Select(substat => new { Type = substat.Key, Value = substat.Value }).ToList(),
                TargetValue = targetValue,
                ErTargetValue = erTargetValue,
                TopPercent = distribution.TopPercent(echoValue),
                ErTopPercent = distribution.ErTopPercent(echoValue),
                Evaluation = EchoCalculator.EvaluateEcho(echo, table, targetValue, erTargetValue),
            });
        }
    }
}
Write("echo-evaluation.json", new
{
    Source = source,
    ValueTables = Fixtures.EvaluationEchoes().Select(echoCase => echoCase.Table).Distinct().Select(name => Fixtures.Describe(byName[name])).ToList(),
    Cases = evaluationCases,
});

// 3. Upgrade Strategy: every strategy on every listed table.
var strategies = Fixtures.Strategies();
var strategyTables = Fixtures.StrategyTables.Select(name => byName[name]).ToList();
var strategyCases = new List<object>();
foreach (var table in strategyTables)
{
    foreach (var (name, ruleGroups) in strategies)
    {
        var strategy = new UpgradeStrategy();
        foreach (var (tuneStage, rules) in ruleGroups)
            strategy.AddRuleGroup(tuneStage, rules);
        var stopwatch = Stopwatch.StartNew();
        var result = EchoCalculator.CalculateUpgradeStrategy(strategy, table);
        var successful = SuccessfulEchoScores.Of(strategy, table);
        CheckAgainstCore(name, table.Name, result, successful);
        Console.WriteLine($"  {name} on {table.Name}: {stopwatch.Elapsed.TotalSeconds:F2} s, Success Rate {result.SuccessRate:P4}, {successful?.OutcomeCount ?? 0} Successful Echo Values");
        strategyCases.Add(new
        {
            StrategyName = name,
            ValueTableName = table.Name,
            Result = result,
            SuccessfulEchoValues = successful is null ? null : new
            {
                successful.Best,
                successful.Worst,
                successful.Average,
                successful.Median,
                successful.Distribution,
            },
        });
    }
}
Write("upgrade-strategy.json", new
{
    Source = source,
    ValueTables = strategyTables.Select(Fixtures.Describe).ToList(),
    Strategies = strategies.Select(strategy => new
    {
        Name = strategy.Name,
        RuleGroups = strategy.RuleGroups.Select(group => new { TuneStage = group.TuneStage, Rules = group.Rules.Select(Fixtures.Describe).ToList() }).ToList(),
    }).ToList(),
    Cases = strategyCases,
});

// The derived distribution must agree with what the Core itself returns.
static void CheckAgainstCore(string strategy, string table, UpgradeStrategyResult result, SuccessfulEchoScores.Result? successful)
{
    void Check(string what, double expected, double actual)
    {
        if (Math.Abs(expected - actual) > 1e-9)
            throw new InvalidOperationException($"{strategy} on {table}: the derived {what} is {actual:R}, the Core's is {expected:R}.");
    }
    if (successful is null)
    {
        if (result.AverageKeptEchoValue is not null)
            throw new InvalidOperationException($"{strategy} on {table}: the Core keeps Echoes, the derived pass keeps none.");
        return;
    }
    Check("Success Rate", result.SuccessRate, successful.SuccessRate);
    Check("Average", result.AverageKeptEchoValue!.Value, successful.Average);
    Check("Minimum", result.MinimumKeptEchoValue!.Value, successful.Worst);
}

static string Git(string directory, params string[] arguments)
{
    var (exitCode, output) = Run(directory, "git", arguments);
    if (exitCode != 0)
        throw new InvalidOperationException($"git {string.Join(' ', arguments)} failed in {directory}.");
    return output;
}

static (int ExitCode, string Output) Run(string directory, string fileName, params string[] arguments)
{
    var start = new ProcessStartInfo(fileName) { WorkingDirectory = directory, RedirectStandardOutput = true, UseShellExecute = false };
    foreach (var argument in arguments)
        start.ArgumentList.Add(argument);
    using var process = Process.Start(start)!;
    string output = process.StandardOutput.ReadToEnd();
    process.WaitForExit();
    return (process.ExitCode, output);
}
