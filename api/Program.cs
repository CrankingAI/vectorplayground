using System.ClientModel;
using Azure.AI.OpenAI;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

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
