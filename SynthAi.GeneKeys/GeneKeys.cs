namespace SynthAi.GeneKeys;

public record GeneKey(int Number, string Shadow, string Gift, string Siddhi);

public static class GeneKeyRepository
{
    public static IReadOnlyList<GeneKey> All { get; } = new List<GeneKey>
    {
        new GeneKey(1, "Entropy", "Freshness", "Beauty"),
        new GeneKey(2, "Dislocation", "Orientation", "Unity"),
        new GeneKey(3, "Chaos", "Innovation", "Innocence"),
        new GeneKey(4, "Intolerance", "Understanding", "Forgiveness"),
        new GeneKey(5, "Impatience", "Patience", "Timelessness"),
        // ... continue filling all 64 Gene Keys with Shadow/Gift/Siddhi
    };
}
