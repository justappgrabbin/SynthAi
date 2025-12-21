namespace SynthAi.YiJing;

public interface IChangeGenerator
{
    Movement Generate(Func<int, int> random);
}
