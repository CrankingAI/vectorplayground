using System.ClientModel;
using System.Text.Json;
using Azure.Core.Serialization;
using Azure.AI.OpenAI;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();
builder.Services.Configure<WorkerOptions>(options =>
{
    options.Serializer = new JsonObjectSerializer(new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    });
});

var endpoint = builder.Configuration["Foundry:Endpoint"]
    ?? throw new InvalidOperationException("Foundry:Endpoint is required");
var apiKey = builder.Configuration["Foundry:ApiKey"]
    ?? throw new InvalidOperationException("Foundry:ApiKey is required");

var azureClient = new AzureOpenAIClient(
    new Uri(endpoint),
    new ApiKeyCredential(apiKey));

builder.Services.AddSingleton(azureClient);
builder.Services.AddSingleton<EmbeddingService>();

builder.Build().Run();
