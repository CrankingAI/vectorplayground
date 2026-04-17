using Azure.AI.OpenAI;
using Microsoft.Extensions.AI;
using OpenAI.Embeddings;

/// <summary>
/// Generates embeddings using Azure AI Foundry and supports vector arithmetic expressions.
/// </summary>
public class EmbeddingService(AzureOpenAIClient client)
{
    private static readonly string[] SupportedModels =
    [
        "text-embedding-ada-002",
        "text-embedding-3-small",
        "text-embedding-3-large",
    ];

    public static IReadOnlyList<string> GetSupportedModels() => SupportedModels;

    public async Task<ReadOnlyMemory<float>> GenerateEmbeddingAsync(string text, string model)
    {
        ValidateModel(model);
        var generator = CreateGenerator(model);
        return await generator.GenerateVectorAsync(text);
    }

    /// <summary>
    /// Evaluates a vector arithmetic expression like "king - man + woman".
    /// </summary>
    public async Task<ReadOnlyMemory<float>> EvaluateExpressionAsync(string expression, string model)
    {
        ValidateModel(model);
        var terms = ParseExpression(expression);

        if (terms is [])
            throw new ArgumentException("Expression must contain at least one term.");

        var generator = CreateGenerator(model);

        var result = (await generator.GenerateVectorAsync(terms[0].Text)).ToArray();

        foreach (var term in terms.Skip(1))
        {
            var termVector = (await generator.GenerateVectorAsync(term.Text)).ToArray();
            result = term.Op switch
            {
                Op.Add => VectorMath.Add(result, termVector),
                Op.Subtract => VectorMath.Subtract(result, termVector),
                _ => throw new InvalidOperationException($"Unknown operation: {term.Op}"),
            };
        }

        return result;
    }

    private IEmbeddingGenerator<string, Embedding<float>> CreateGenerator(string model)
    {
        EmbeddingClient embeddingClient = client.GetEmbeddingClient(model);
        return embeddingClient.AsIEmbeddingGenerator();
    }

    private static List<ExpressionTerm> ParseExpression(string expression)
    {
        List<ExpressionTerm> terms = [];
        var currentOp = Op.Add;
        var currentTerm = "";

        foreach (var ch in expression)
        {
            if (ch is '+' or '-')
            {
                var trimmed = currentTerm.Trim();
                if (trimmed.Length > 0)
                    terms.Add(new(trimmed, currentOp));

                currentOp = ch is '+' ? Op.Add : Op.Subtract;
                currentTerm = "";
            }
            else
            {
                currentTerm += ch;
            }
        }

        var lastTrimmed = currentTerm.Trim();
        if (lastTrimmed.Length > 0)
            terms.Add(new(lastTrimmed, currentOp));

        return terms;
    }

    private static void ValidateModel(string model)
    {
        if (!SupportedModels.Contains(model))
            throw new ArgumentException(
                $"Unsupported model: {model}. Supported: {string.Join(", ", SupportedModels)}");
    }

    private enum Op { Add, Subtract }
    private record ExpressionTerm(string Text, Op Op);
}
