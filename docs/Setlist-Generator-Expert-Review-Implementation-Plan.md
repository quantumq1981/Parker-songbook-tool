# Setlist Generator: Safe Upgrade & Fix Plan (Non-Disruptive)

This plan is designed for a **live GitHub Pages deployment** where stability is the top priority. It proposes incremental changes that can be enabled behind feature flags and shipped in small PRs.

## 1) Deep-Dive Findings from Current Code Structure

### A. Monolithic architecture increases regression risk
- The app is currently a single-page document with extensive inline CSS/JS and in-file tune data.
- The SONGS dataset, playback engine, rendering logic, filtering, printing, and fretboard/theory logic are tightly coupled.
- This coupling makes even small edits risky because there is no clear module boundary for data import/export, validation, rendering, and playback.

### B. Data model mismatch with setlist workflows
- Current data is tune-centric (title/key/form/progression), while setlist workflows are typically **event-centric** (set number, slot order, transition notes, duration, singer, style tags, medley links).
- There is no canonical CSV schema for ingestion/export.

### C. No dedicated import validation layer
- CSV/source normalization errors (extra whitespace, alternate chord symbols, missing keys, inconsistent headers) are not validated in a centralized pipeline.
- This creates user-facing failures late in the render stage rather than actionable import-time errors.

### D. No explicit compatibility policy for CSV versions
- Future changes to columns or naming can break existing files because version negotiation and migration are not defined.

## 2) High-Value Upgrades (Ordered by Safety + Impact)

## Phase 0 — Safety Foundation (No UX disruption)
1. **Introduce a read-only data contract document**
   - Add `docs/csv-schema-v1.md` with required/optional columns and examples.
2. **Add parser + validator utility (not wired into UI yet)**
   - Implement `parseSetlistCsv()` and `validateSetlistRows()` in a standalone JS module.
3. **Add unit tests for import edge cases**
   - BOM headers, mixed line endings, empty rows, duplicate set-slot keys, malformed chords, unknown keys.
4. **Add error taxonomy**
   - `E_HEADER_MISSING`, `E_KEY_INVALID`, `E_SLOT_DUPLICATE`, etc.

## Phase 1 — Shadow Import Mode (Feature-flagged)
1. Add hidden import entry point (`?importPreview=1`) that parses CSV and renders diagnostics only.
2. Keep production rendering path untouched by default.
3. Log import diagnostics in a structured panel:
   - row number
   - severity
   - field name
   - suggested fix

## Phase 2 — Controlled Integration
1. Map validated rows into internal normalized objects:
   - `SetlistEvent`, `SetEntry`, `TuneRef`, `PlaybackHint`.
2. Use stable IDs for setlist entries to avoid index-based UI bugs.
3. Add export to canonical CSV (round-trip-safe).

## Phase 3 — UX Enhancements
1. Drag-and-drop row reorder with persistence.
2. Conflict indicators (same tune repeated too closely, large BPM jumps, key-clash warnings).
3. Auto-duration and total-set timing estimates.
4. Print + share templates optimized for rehearsal vs performance.

## 3) Suggested Canonical CSV Schema (v1)

Required columns:
- `set_number`
- `slot`
- `title`
- `original_key`
- `target_key`

Recommended optional columns:
- `bpm`
- `duration_min`
- `style`
- `form`
- `count_in`
- `loop_mode`
- `notes`
- `medley_group`
- `version`

Rules:
- `(set_number, slot)` must be unique.
- `title` normalized case-insensitively for matching.
- keys must map to an allowed note list.
- blank optional fields should normalize to `null`.

## 4) Fixes to Prioritize Immediately

1. **Data source integrity check at startup**
   - Verify tune dataset length and key/form presence before enabling controls.
2. **Guard rails for malformed tune metadata**
   - Prevent render/playback crashes when any tune row is incomplete.
3. **Centralized chord normalization utility**
   - Normalize symbols once before render/playback.
4. **Print path hardening**
   - Ensure print generation handles missing metadata safely.

## 5) Rollout Strategy for Live GitHub Pages

1. Ship parser/validator/tests first (no runtime usage).
2. Release hidden preview mode for internal verification.
3. Enable import for a small known-good CSV fixture.
4. Add migration helper for legacy CSV headers.
5. Enable generally only after passing round-trip tests.

## 6) Definition of Done for Setlist CSV Reliability

- Import success rate > 99% for known fixture pack.
- All validation errors include row/column + fix hint.
- Exported CSV re-imports with zero semantic drift.
- No regressions in lead sheet generation and playback flow.

## 7) Practical Next PR Breakdown

1. PR-1: `docs/csv-schema-v1.md`, `docs/error-codes.md`, fixture CSV files.
2. PR-2: `src/import/csvParser.js`, `src/import/validator.js`, tests.
3. PR-3: Hidden import preview UI and diagnostics panel.
4. PR-4: Integrate validated setlists into tune selection + export.

