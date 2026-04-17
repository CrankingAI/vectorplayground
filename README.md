# Vector Playground

Playground to learn about vector embeddings. Yes, those vectors from physics or linear algebra are back - but now semantically representing content through what the AI field refers to as an embedding model.

Live at [vectorplayground.com](https://vectorplayground.com)

## What Can You Do?

Compare phrases and see how similar they are semantically. Try vector arithmetic like `king - man + woman`. Switch between embedding models to see how they differ.

## Example Comparisons

| Phrase 1 | Phrase 2 | Relationship |
|----------|----------|-------------|
| dog | cat | Common animals |
| thank you | gracias | Same meaning, different languages |
| thank you | xie xie | Same meaning, different languages |
| thank you | dhonnobad | Same meaning, different languages |
| thank you | shukriya | Same meaning, different languages |
| thank you | dhanyavaad | Same meaning, different languages |
| thank you | asante | Same meaning, different languages |
| happy | sad | Opposites |
| hot | cold | Opposites |
| love | hate | Opposites |
| football | soccer | Regional terminology |
| computer | laptop | Related items |
| airplane | aircraft | Synonyms |
| book | novel | Related items |
| student | pupil | Synonyms |
| doctor | physician | Synonyms |
| cup | Cup | Capitalization |
| cup | CUP | Capitalization |
| cup | cup. | Punctuation |
| cup | c u p | Spacing |

## Embedding Models

| Model | Dimensions | Notes |
|-------|-----------|-------|
| text-embedding-ada-002 | 1,536 | Legacy model |
| text-embedding-3-small | 1,536 | Cost-effective |
| text-embedding-3-large | 3,072 | Most capable |

## Vector Arithmetic

Embeddings support arithmetic! Try expressions like:

- `king - man + woman` (should be similar to "queen")
- `paris - france + germany` (should be similar to "berlin")
- `happy + very` (intensification)

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Material UI
- **Backend**: .NET 10 Azure Functions with Microsoft.Extensions.AI
- **Infrastructure**: Azure Static Web Apps + Azure AI Foundry, deployed via Bicep
- **Domain**: vectorplayground.com

## Development

```bash
# First-time setup
./scripts/setup-env.sh

# Deploy infrastructure + code
./scripts/deploy.sh

# Validate Bicep templates
./scripts/validate-bicep.sh

# Local development
cd app && npm run dev    # Frontend on :5173
cd api && func start     # API on :7071
```

## License

MIT - [Cranking AI](https://crankingai.com)
