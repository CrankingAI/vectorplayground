using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

/// <summary>
/// Compares two phrases by computing cosine similarity between their embedding vectors.
/// Supports vector arithmetic expressions (e.g., "king - man + woman").
/// </summary>
public class ComparePhrases(EmbeddingService embeddingService, ILogger<ComparePhrases> logger)
{
    [Function("ComparePhrases")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
    {
        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var phrase1 = query["phrase1"];
        var phrase2 = query["phrase2"];
        var model = query["model"] ?? "text-embedding-3-small";

        if (string.IsNullOrWhiteSpace(phrase1) || string.IsNullOrWhiteSpace(phrase2))
        {
            var badRequest = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
            await badRequest.WriteAsJsonAsync(new { error = "Both phrase1 and phrase2 are required." });
            return badRequest;
        }

        logger.LogInformation("Comparing '{Phrase1}' and '{Phrase2}' using {Model}", phrase1, phrase2, model);

        try
        {
            var vector1 = await GetVectorAsync(phrase1, model);
            var vector2 = await GetVectorAsync(phrase2, model);

            var similarity = VectorMath.CosineSimilarity(vector1.Span, vector2.Span);

            var result = new CompareResult(
                Phrase1: phrase1,
                Phrase2: phrase2,
                Model: model,
                Dimensions: vector1.Length,
                Similarity: Math.Round(similarity, 6));

            var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
            await response.WriteAsJsonAsync(result);
            return response;
        }
        catch (ArgumentException ex)
        {
            var badRequest = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
            await badRequest.WriteAsJsonAsync(new { error = ex.Message });
            return badRequest;
        }
    }

    [Function("ListModels")]
    public async Task<HttpResponseData> ListModels(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
    {
        var models = EmbeddingService.GetSupportedModels();
        var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { models });
        return response;
    }

    private Task<ReadOnlyMemory<float>> GetVectorAsync(string phrase, string model) =>
        phrase.Contains('+') || phrase.Contains('-')
            ? embeddingService.EvaluateExpressionAsync(phrase, model)
            : embeddingService.GenerateEmbeddingAsync(phrase, model);
}

public record CompareResult(
    string Phrase1,
    string Phrase2,
    string Model,
    int Dimensions,
    double Similarity);
