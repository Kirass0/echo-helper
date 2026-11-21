namespace EchoHelper
{
    // The weights are copied in, so the table can't change after it is built.
    public sealed class ValueTable(string name, IReadOnlyDictionary<SubstatType, double> weights)
    {
        private readonly Dictionary<SubstatType, double> weights = new(weights);

        public string Name { get; } = name;

        // A Substat type the table doesn't list has a weight of 0.
        public double WeightOf(SubstatType type) => weights.GetValueOrDefault(type);
    }
}
