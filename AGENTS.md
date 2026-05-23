# AGENTS.md

Instructions for AI coding agents (Claude Code, GitHub Copilot, OpenAI Codex,
Gemini CLI, Cursor, Aider) working in this repository.

## Version: single source of truth

The repo-root `VERSION` file is the **only** place the project version is
authored. Everything else reads from it.

```
VERSION                  ← edit this, and only this, to bump the version
├── api/api.csproj       ← reads via MSBuild: $([System.IO.File]::ReadAllText('$(MSBuildThisFileDirectory)../VERSION').Trim())
└── app/package.json     ← synced by scripts/sync-version.sh (runs as npm `prebuild`)
```

**Rules:**

- Never hardcode a version string in `api/api.csproj`, `app/package.json`,
  Bicep files, GitHub Actions YAML, or anywhere else.
- To bump: edit `VERSION` only. The API picks it up on next `dotnet build`;
  the frontend picks it up on next `npm run build` (the `prebuild` hook runs
  `scripts/sync-version.sh`).
- CI may gate drift with `scripts/sync-version.sh --check`.
- The version displayed in the UI ("API v1.1.0.0") comes from the API
  assembly version at runtime via `/livez` / `/readyz`, not from a build-time
  constant in the frontend.
