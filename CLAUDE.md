# Vector Playground - Development Guide

## Project Overview

Interactive web application for exploring vector embeddings. Deployed to vectorplayground.com.

- **Frontend**: React 19 + TypeScript + Vite + Material UI (MUI) 7 — in `app/`
- **Backend**: .NET 10 Azure Functions (isolated worker) — in `api/`
- **Infrastructure**: Bicep (with AVM patterns) — in `infra/`
- **Scripts**: Bash deployment tools — in `scripts/`
- **CI/CD**: GitHub Actions — in `.github/workflows/`

## Build Commands

```bash
# API
dotnet build api/api.csproj
dotnet publish api/api.csproj -c Release -o api/publish

# Frontend
cd app && npm ci && npm run build

# Scripts validation
bash -n scripts/*.sh
```

## Idiom Requirements

We strive for **idiomatic** use of all key technologies. This means following each ecosystem's conventions, best practices, and modern patterns — not just "making it work."

- **Microsoft Agent Framework**: Use as the AI orchestration layer. Prefer Agent Framework patterns over deprecated Semantic Kernel patterns for new code.
- **.NET 10 / Modern C#**: Use latest C# language features (file-scoped namespaces, primary constructors, collection expressions, pattern matching, records, `ReadOnlySpan<T>`, etc.). Follow .NET 10 conventions.
- **Microsoft.Extensions.AI**: Use `IEmbeddingGenerator<string, Embedding<float>>` abstraction for all embedding operations. Register via DI. Use the pipeline builder for middleware (caching, telemetry).
- **MUI (Material UI)**: Follow MUI 7 patterns — use `sx` prop for styling, MUI theme system, proper component composition. No raw CSS unless absolutely necessary.
- **Azure Static Web Apps (SWA)**: Standard tier with linked backend. Use `staticwebapp.config.json` for routing. SWA CLI for local development.
- **Azure Functions**: Isolated worker model (.NET 10). Use `FunctionsApplication.CreateBuilder` pattern. HTTP triggers with `HttpRequestData`/`HttpResponseData`.
- **Bicep**: Subscription-scoped deployments. Follow Azure Verified Modules (AVM) naming and structure conventions. Use typed parameters, `@description` decorators, and `@batchSize` for sequential deployments.
- **Health checks**: Implement `/livez` and `/readyz` endpoints following Kubernetes probe conventions.
- **Shell scripts**: `set -euo pipefail`, kebab-case naming, `-h`/`--help` support on every script. Follow patterns from nepo-agent `scripts/`.

## Azure Resources

- **Subscription**: EffAz-Prod
- **Resource Group**: `rg-vectorplayground`
- **AI Services**: `vectorplayground-prod` (3 embedding model deployments)
- **Function App**: `func-vectorplayground-prod`
- **Static Web App**: `stapp-vectorplayground-prod`
- **Custom Domain**: vectorplayground.com

## Key Design Decisions

- Embedding models deployed via Bicep (not manually): ada-002, 3-small, 3-large
- Vector arithmetic support in phrase inputs (e.g., `king - man + woman`)
- SWA linked backend routes `/api/*` to the Function App
- Single resource group for all resources
