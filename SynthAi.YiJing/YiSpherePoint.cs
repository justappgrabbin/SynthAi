using Astrolo.Geometry;
using SynthAi.YiJing.Metadata;
using CsvHelper.Configuration.Attributes;

namespace SynthAi.YiJing;

public sealed class YiSpherePoint
{
    public uint Ordinal { get; set; }
    public int Level { get; set; }
    public int Angle { get; set; }
    public int Sphere { get; set; }

    [Ignore]
    public bool Inside => Sphere > 0;

    [Ignore]
    public Angle Elevation => Geometry.Angle.FromDegrees(Level * 30);

    public override string ToString()
    {
        return $"Bits={Convert.ToString(Ordinal, 2).PadLeft(6, '0')} N={Ordinal:00} Angle={Angle} Sphere={Sphere}";
    }

    public static IReadOnlyDictionary<uint, YiSpherePoint> EnumeratePoints()
    {
        return EmbeddedFile
            .DeserializeCsv<YiSpherePoint>("YiSphereAlt.csv")
            .ToDictionary(x => x.Ordinal);
    }
}
