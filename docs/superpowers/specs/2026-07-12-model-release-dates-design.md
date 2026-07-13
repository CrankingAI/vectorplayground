# Model Release Dates — Design

**Date:** 2026-07-12
**Status:** Approved

## Goal

Convey how "modern" each embedding model is by showing its release date next to the
model name everywhere models are displayed.

## Decisions

- **Scope:** all three display surfaces — all-models results rows, single-model result
  chips, and the Embedding Model dropdown.
- **Format:** month + year, explicitly labeled as the release date
  (`released Dec 2022`, `released Jan 2024`).
- **Dates:** Ada 002 → Dec 2022; Embedding 3 Small and Embedding 3 Large → Jan 2024.

## Design

Single source of truth in `app/src/data/models.ts`:

- Add `released: string` to the `EmbeddingModel` interface and each `MODELS` entry.
- Add a `getModelReleased(id)` helper alongside `getModelLabel`.

Display changes:

- **Results rows** (`SimilarityResult.tsx`, `ModelRow`): after the existing `1536d`
  caption, render `· released Dec 2022` as another `Typography variant="caption"`
  `color="text.secondary"`. Rows look up the date from `MODELS` via the helper
  (API row data does not carry it).
- **Single-model result** (`SimilarityResult.tsx`): extend the existing model chip
  label to `Ada 002 · released Dec 2022` rather than adding a separate chip.
- **Dropdown** (`ModelSelector.tsx`): menu item becomes
  `Ada 002 (1536d, released Dec 2022) — Legacy`.

## Out of scope

- Learn page tables (already mention years where relevant).
- API changes — this is purely presentational.

## Verification

`npm run build` in `app/` plus a visual check of the three surfaces.
