using System.Numerics;
using System.Runtime.InteropServices;

/// <summary>
/// SIMD-accelerated element-wise vector operations and cosine similarity.
/// </summary>
public static class VectorMath
{
    public static float[] Add(ReadOnlySpan<float> a, ReadOnlySpan<float> b)
    {
        ValidateLengths(a, b);
        var result = new float[a.Length];
        var resultSpan = result.AsSpan();

        if (Vector.IsHardwareAccelerated)
        {
            var i = 0;
            var vectorSize = Vector<float>.Count;
            var aVecs = MemoryMarshal.Cast<float, Vector<float>>(a);
            var bVecs = MemoryMarshal.Cast<float, Vector<float>>(b);
            var rVecs = MemoryMarshal.Cast<float, Vector<float>>(resultSpan);

            for (var v = 0; v < aVecs.Length; v++, i += vectorSize)
                rVecs[v] = aVecs[v] + bVecs[v];

            for (; i < a.Length; i++)
                result[i] = a[i] + b[i];
        }
        else
        {
            for (var i = 0; i < a.Length; i++)
                result[i] = a[i] + b[i];
        }

        return result;
    }

    public static float[] Subtract(ReadOnlySpan<float> a, ReadOnlySpan<float> b)
    {
        ValidateLengths(a, b);
        var result = new float[a.Length];
        var resultSpan = result.AsSpan();

        if (Vector.IsHardwareAccelerated)
        {
            var i = 0;
            var vectorSize = Vector<float>.Count;
            var aVecs = MemoryMarshal.Cast<float, Vector<float>>(a);
            var bVecs = MemoryMarshal.Cast<float, Vector<float>>(b);
            var rVecs = MemoryMarshal.Cast<float, Vector<float>>(resultSpan);

            for (var v = 0; v < aVecs.Length; v++, i += vectorSize)
                rVecs[v] = aVecs[v] - bVecs[v];

            for (; i < a.Length; i++)
                result[i] = a[i] - b[i];
        }
        else
        {
            for (var i = 0; i < a.Length; i++)
                result[i] = a[i] - b[i];
        }

        return result;
    }

    public static double CosineSimilarity(ReadOnlySpan<float> a, ReadOnlySpan<float> b)
    {
        ValidateLengths(a, b);

        double dotProduct = 0, magnitudeA = 0, magnitudeB = 0;

        for (var i = 0; i < a.Length; i++)
        {
            dotProduct += a[i] * (double)b[i];
            magnitudeA += a[i] * (double)a[i];
            magnitudeB += b[i] * (double)b[i];
        }

        magnitudeA = Math.Sqrt(magnitudeA);
        magnitudeB = Math.Sqrt(magnitudeB);

        return (magnitudeA == 0 || magnitudeB == 0)
            ? 0
            : dotProduct / (magnitudeA * magnitudeB);
    }

    private static void ValidateLengths(ReadOnlySpan<float> a, ReadOnlySpan<float> b)
    {
        if (a.Length != b.Length)
            throw new ArgumentException($"Vector dimensions must match: {a.Length} vs {b.Length}");
    }
}
