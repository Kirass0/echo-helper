using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text.Json;

namespace EchoHelper
{
    // The hand-edited file of Value Tables: a JSON array of { "name", "weights" }, with Substat types written by enum name.
    public static class ValueTableFile
    {
        // The first problem fails the whole file, so a typo gets fixed rather than silently dropping a table.
        public static bool TryLoad(string path, [NotNullWhen(true)] out IReadOnlyList<ValueTable>? tables, [NotNullWhen(false)] out string? problem)
        {
            (tables, problem) = (null, null);
            try
            {
                tables = Parse(File.ReadAllText(path));
                return true;
            }
            catch (Exception e) when (e is FileNotFoundException or DirectoryNotFoundException)
            {
                problem = "The file was not found.";
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                problem = $"The file can't be read: {e.Message}";
            }
            catch (JsonException e)
            {
                problem = $"The file isn't valid JSON: {e.Message}";
            }
            catch (FileProblem e)
            {
                problem = e.Message;
            }
            return false;
        }

        // Something to copy from when writing the real file by hand, since the app has no built-in tables to show.
        public static void WriteExample(string path)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
            using var stream = File.Create(path);
            using var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = true });
            writer.WriteStartArray();
            foreach (var (name, weights) in exampleTables)
            {
                writer.WriteStartObject();
                writer.WriteString("name", name);
                writer.WriteStartObject("weights");
                foreach (var (type, weight) in weights)
                {
                    // "0.0" rather than "0", so every weight reads as a decimal to edit.
                    string number = weight.ToString("R", CultureInfo.InvariantCulture);
                    writer.WritePropertyName(type.ToString());
                    writer.WriteRawValue(number.All(c => char.IsAsciiDigit(c) || c == '-') ? number + ".0" : number);
                }
                writer.WriteEndObject();
                writer.WriteEndObject();
            }
            writer.WriteEndArray();
        }

        // Every Substat type is listed, even at 0, so the example shows all the names a table can use.
        private static readonly (string Name, (SubstatType Type, double Weight)[] Weights)[] exampleTables =
        [
            ("Cantarella",
            [
                (SubstatType.Atk_Percent, 3.56),
                (SubstatType.Hp_Percent, 0.0),
                (SubstatType.Def_Percent, 0.0),
                (SubstatType.Critical_Rate, 6.27),
                (SubstatType.Critical_Damage, 4.86),
                (SubstatType.Basic_Attack, 3.21),
                (SubstatType.Heavy, 0.08),
                (SubstatType.Skill, 0.28),
                (SubstatType.Liberation, 0.0),
                (SubstatType.Atk_Flat, 1.84),
                (SubstatType.Hp_Flat, 0.0),
                (SubstatType.Def_Flat, 0.0),
                (SubstatType.Energy_Regen, 0.0),
            ]),
            ("Phrolova",
            [
                (SubstatType.Atk_Percent, 3.23),
                (SubstatType.Hp_Percent, 0.0),
                (SubstatType.Def_Percent, 0.0),
                (SubstatType.Critical_Rate, 6.37),
                (SubstatType.Critical_Damage, 5.1),
                (SubstatType.Basic_Attack, 0.2),
                (SubstatType.Heavy, 0.0),
                (SubstatType.Skill, 1.8),
                (SubstatType.Liberation, 0.0),
                (SubstatType.Atk_Flat, 1.46),
                (SubstatType.Hp_Flat, 0.0),
                (SubstatType.Def_Flat, 0.0),
                (SubstatType.Energy_Regen, 0.0),
            ]),
        ];

        private static List<ValueTable> Parse(string json)
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Array)
                throw new FileProblem("The file should be a JSON array of Value Tables.");
            var tables = new List<ValueTable>();
            foreach (var (element, index) in document.RootElement.EnumerateArray().Select((element, index) => (element, index)))
            {
                var table = ParseTable(element, $"Value Table {index + 1}");
                if (tables.Any(other => other.Name == table.Name))
                    throw new FileProblem($"Two Value Tables are named \"{table.Name}\".");
                tables.Add(table);
            }
            if (tables.Count == 0)
                throw new FileProblem("The file has no Value Tables.");
            return tables;
        }

        private static ValueTable ParseTable(JsonElement element, string label)
        {
            if (element.ValueKind != JsonValueKind.Object)
                throw new FileProblem($"{label} isn't a JSON object.");
            string? name = element.TryGetProperty("name", out var nameElement) && nameElement.ValueKind == JsonValueKind.String ? nameElement.GetString() : null;
            if (string.IsNullOrWhiteSpace(name))
                throw new FileProblem($"{label} has no name.");
            label = $"Value Table \"{name}\"";
            var unknown = element.EnumerateObject().FirstOrDefault(property => property.Name is not ("name" or "weights"));
            if (unknown.Value.ValueKind != JsonValueKind.Undefined)
                throw new FileProblem($"{label} has an unknown property \"{unknown.Name}\"; a Value Table has only \"name\" and \"weights\".");
            if (!element.TryGetProperty("weights", out var weightsElement) || weightsElement.ValueKind != JsonValueKind.Object)
                throw new FileProblem($"{label} has no \"weights\" object.");

            var weights = new Dictionary<SubstatType, double>();
            foreach (var weight in weightsElement.EnumerateObject())
            {
                if (!substatTypes.TryGetValue(weight.Name, out var type))
                    throw new FileProblem($"{label} has an unknown Substat type \"{weight.Name}\". The Substat types are: {string.Join(", ", substatTypes.Keys)}.");
                if (weight.Value.ValueKind != JsonValueKind.Number || !weight.Value.TryGetDouble(out var value) || !double.IsFinite(value))
                    throw new FileProblem($"{label}: the weight of {type} isn't a number.");
                if (!weights.TryAdd(type, value))
                    throw new FileProblem($"{label} lists {type} twice.");
            }
            return new ValueTable(name, weights);
        }

        // Matched by exact name, unlike Enum.Parse, which also takes numbers and ignores case on request.
        private static readonly Dictionary<string, SubstatType> substatTypes = Enum.GetValues<SubstatType>().ToDictionary(type => type.ToString());

        private sealed class FileProblem(string message) : Exception(message);
    }
}
