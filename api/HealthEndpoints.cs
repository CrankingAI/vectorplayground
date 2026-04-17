using Azure.AI.OpenAI;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.AI;
using OpenAI.Embeddings;

/// <summary>
/// Health check endpoints for container orchestration and monitoring.
/// </summary>
public class HealthEndpoints(AzureOpenAIClient aiClient)
{
    private static readonly string Version =
        typeof(HealthEndpoints).Assembly.GetName().Version?.ToString() ?? "1.0.0";

    /// <summary>
    /// Liveness probe — returns 200 if the process is running.
    /// </summary>
    [Function("livez")]
    public async Task<HttpResponseData> Livez(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "livez")] HttpRequestData req)
    {
        var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new LivenessResponse("alive"));
        return response;
    }

    /// <summary>
    /// Readiness probe — returns 200 if the service can reach Azure AI Foundry
    /// and generate an embedding.
    /// </summary>
    [Function("readyz")]
    public async Task<HttpResponseData> Readyz(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "readyz")] HttpRequestData req)
    {
        try
        {
            // Smoke-test: generate a trivial embedding to verify end-to-end connectivity
            var generator = aiClient.GetEmbeddingClient("text-embedding-3-small")
                .AsIEmbeddingGenerator();
            var probe = await generator.GenerateVectorAsync("ready");

            var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new ReadinessResponse(
                Status: "ready",
                Version: Version,
                ModelsConfigured: EmbeddingService.GetSupportedModels().Count,
                Models: [.. EmbeddingService.GetSupportedModels()],
                ProbeDimensions: probe.Length));
            return response;
        }
        catch
        {
            var response = req.CreateResponse(System.Net.HttpStatusCode.ServiceUnavailable);
            await response.WriteAsJsonAsync(new ReadinessResponse(
                Status: "unavailable",
                Version: Version,
                ModelsConfigured: 0,
                Models: [],
                ProbeDimensions: 0));
            return response;
        }
    }
}

public record LivenessResponse(string Status);

public record ReadinessResponse(
    string Status,
    string Version,
    int ModelsConfigured,
    string[] Models,
    int ProbeDimensions);
