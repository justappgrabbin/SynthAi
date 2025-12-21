namespace SynthAi.YiJing;

public interface IFigure : IEnumerable<Line>
{
    int LineCount { get; }
}
