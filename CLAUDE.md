# CLAUDE.md — Parker Songbook Tool: Complete Development Log

## Project Overview

**Application:** Charlie Parker Songbook Trainer  
**Version:** 7.0 → 7.2 (Enhanced Edition)  
**Tech Stack:** Vanilla JavaScript SPA, pure CSS, no build system  
**Entry Point:** `index.html` (single file, ~6,500+ lines)  
**Active Branch:** `claude/alphatab-notation-integration-QkYOX`

---

## Codebase Architecture

- Single HTML file SPA with inline CSS, HTML, and JavaScript
- 9 external JavaScript modules in `/js/` (including `pitch-processor.js`)
- Resonance Engine in `/src/features/resonance-engine/`
- Pure CSS design system with CSS custom properties
- No framework (no React/Vue/Svelte), no build tool, no runtime dependencies
- `package.json` exists only for the dev `test` script (`npm test` → `node tests/run-all.js`); there are no installable deps
- CI: `.github/workflows/ci.yml` runs `npm test` on every push and PR to `main`
- CDN dependencies (all version-pinned with SRI `integrity` + `crossorigin="anonymous"`): AlphaTab `@coderline/alphatab@1.8.3`, SVGuitar 1.7.1, JSZip 3.10.1
- Web Audio API for synthesis + AudioWorklet for real-time pitch detection
- IndexedDB for practice session storage
- Service Worker for offline/PWA support
- **66 total songs** (22 core SONGS object + 44 OMNIBOOK_ADDITIONS)

---

## Song Library (66 Total)

### Core SONGS (22)
Anthropology, Au Privave, Barbados, Billie's Bounce, Bloomdido, Blues for Alice, Cheryl, Chi Chi, Confirmation, Dewey Square, Donna Lee, Ko-Ko, Moose the Mooche, Now's the Time, Ornithology, Relaxin' at Camarillo, Scrapple from the Apple, Yardbird Suite, Parker's Mood, Embraceable You, Oh, Lady Be Good, Crazeology

### Omnibook Additions (44)
An Oscar for Treadwell, Another Hairdo, Back Home Blues, Bird Gets the Worm, Blue Bird, Buzzy, Card Board, Celerity, Chasing the Bird, Cosmic Rays, Diverse, KC Blues, Kim, Laird Baird, Marmaduke, Mohawk, My Little Suede Shoes, Passport, Perhaps, Red Cross, Relaxing With Lee, Segment, Shawnuff, Si Si, Steeplechase, The Bird, Thriving From a Riff, Visa, Warming Up a Riff, Ah-Leu-Cha, Cool Blues, Constellation, Celebrity, Drifting on a Reed, Leap Frog, Little Willie Leaps, The Hymn, Stupendous, Bongo Bop, Lover Man, Quasimodo, Salt Peanuts, Tiny's Tempo, Meandering

### Source / Deduplication
- 46 unique tunes sourced from `docs/omnibook_xml (1).zip` (AutoImprov MusicXML collection) — all are present  
- Duplicates consolidated: Au Private 1+2 → Au Privave; Kim 1+2 → Kim; Mohawk 1+2 → Mohawk; Now's The Time 1+2 → Now's the Time; Ko Ko → Ko-Ko  
- 15 additional Parker heads added manually (session 2026-05-19): Ah-Leu-Cha, Cool Blues, Constellation, Celebrity, Drifting on a Reed, Leap Frog, Little Willie Leaps, The Hymn, Stupendous, Bongo Bop, Lover Man, Quasimodo, Salt Peanuts, Tiny's Tempo, Meandering

---

## Bugs Found & Fixed

### 1. Missing CSS Variables (`--border`, `--card`)
**Location:** `index.html` (inline styles on `#sectionSelect` and `#sectionTabDisplay`)  
**Fix:** Added `--border: var(--barline)` and `--card: var(--panel)` as aliases in `:root`, plus new design tokens `--radius`, `--transition`, `--shadow-md`, `--focus-ring`.

### 2. JSZip CDN Failure — No Error Handling
**Fix:** Added `onerror` handler to JSZip `<script>` tag. `exportSectionZip` wrapped to show a toast instead of bare `alert()` when JSZip is unavailable.

### 3. Missing ARIA Live Regions
**Fix:** Added `aria-live="polite"` and `role="status"` to `#playStatus`, `#audioStatus`, `#resonanceStatus`, `#analysisChord`, `#statsBar`.

### 4. Misleading H2 Text
**Fix:** Updated from "18 Bebop Classics — PRO Edition" to "Complete Bebop Songbook".

### 5. Missing Semantic HTML Landmarks
**Fix:** Changed `<div class="card">` to `<main class="card" role="main">`. Added `<a class="skip-link" href="#sheet">`.

### 6. AlphaTab Transposition — `window.*` False Guards
**Location:** `alphaTabNotationModule` — `getSemitones()` and `getTuneOriginalKey()`  
**Issue:** Guards used `window.NOTE_IDX` and `window.SONGS` which are `const` top-level declarations and therefore NOT properties of `window`. Guards always evaluated false; transposition always returned 0; original key always returned null.  
**Fix:** Removed `window.*` guards; access `NOTE_IDX`/`SONGS` directly from enclosing scope.

### 7. GP Badge Not Appearing on Load
**Issue:** `updateGpBadge()` was never called at startup or on preference restore, so the AlphaTab notation badge only appeared after user interaction.  
**Fix:** Added `updateGpBadge()` call after `renderLeadSheet()` in both the startup sequence and `_loadAndApplyPrefs()`.

---

## Features Added

### 1. AlphaTab Notation Integration
- AlphaTab CDN library `@coderline/alphatab@1.8.3` (pinned, SRI-protected) loaded with AudioWorklet SoundFont
- GP file loading from `/docs/` directory (13 GP/GPX files bundled)
- Notation tab inside the lead sheet panel; renders standard notation + tablature
- Transposition via `getSemitones()` + AlphaTab `settings.display.transpositionPitches`
- GP badge indicator on song name when a GP file is available
- AlphaTex export from Section Lick Generator

### 2. Progressive Web App (PWA)
- `service-worker.js`: cache-first strategy for all app shell assets and CDN resources
- `manifest.json`: standalone display, theme color, maskable SVG icon
- `icons/icon.svg`: treble clef on dark purple background
- Offline banner (`#offlineBanner`) shown when `navigator.onLine` is false
- Cache version: `cp-songbook-v3`; bump on any shell change
- CDN caching locked to an explicit pinned-URL allowlist (`CDN_ASSETS`), not a host wildcard

### 3. Practice Session Tracker
- IndexedDB database `cp_practice_db` v1, store `sessions` with `by_tune` + `by_date` indexes
- Auto-start session when tune is selected/changed; auto-stop on app close
- `#practicePanel` (`<details>`) collapsible panel: active session timer, stats (total sessions, total time, streak), last-10 sessions table
- CSV export via `pjExportBtn`
- Weighted random tune selection: capture-phase listener on `#randomTune` button uses `stopImmediatePropagation()` to intercept before original handler; skews toward under-practiced tunes
- `MutationObserver` on `#tuneSel` re-annotates dropdown options after every `populateTuneDropdown()` rebuild

### 4. Real-Time Pitch Detection
- `js/pitch-processor.js`: `AudioWorkletProcessor` implementing YIN pitch detection algorithm  
  - 2048-sample window, 512-sample hop size, 0.10 CMNDF threshold  
  - RMS silence gate (threshold 0.008)  
  - Parabolic interpolation for sub-sample accuracy  
- `pitchModule` IIFE in `index.html`: `getUserMedia` → `AudioContext` → `AudioWorkletNode`  
  - Audio processed entirely locally (worklet not connected to destination)  
  - Note name display with cents deviation  
  - In-scale scoring: compares detected note PC against current bar's chord scale PCs  
  - Fretboard highlight: adds `.pitch-live` class to matching fret cell(s)  
- `#togglePitch` button: toggles mic on/off; `#pitchDisplay` panel shows live data
- Privacy notice rendered in UI: "🔒 Audio processed locally — never leaves your device"

### 5. SVG Fretboard Redesign
- Replaced `<div class="string">` / `<div class="fret">` layout with a single SVG element
- Dark wood-grain linear gradient background (`fbWood` gradient: `#6b4423` → `#4a2e14`)
- Ivory nut rect, metal fret line rects, string lines with stroke-width increasing by gauge
- Position dot markers: single dot at frets 3/5/7/9, double dot at 12; fret numbers below
- String name labels (E B G D A E) at left edge
- `<g class="fret">` cells: each contains `<circle>` + `<text>` children
  - `g._circle` and `g._label` shortcuts for fast attribute access
  - `Object.defineProperty(g, 'textContent', ...)` routes through SVG `<text>` for compatibility with existing code (shows interval label — second line of two-line strings)
  - All cells registered in `_fretGrid = new Map()` keyed `"engineString_fretNum"` for O(1) lookup
- `findFretEl()` uses `_fretGrid.get()` instead of DOM traversal
- `clearFretboard()` resets SVG `fill`/`stroke` via `setAttribute`
- `showFretboard()` and `showLibraryScale()` use `fr._circle.setAttribute('fill', ...)` / `fr._label.setAttribute('fill', ...)`
- `buildFretMarkers()` is a no-op (markers drawn inline during `buildFretboard()`)
- SVG is responsive: `width="100%"`, `height="auto"`

### 6. Accessibility & UX (v7.1)
- Skip navigation link (`.skip-link`)
- Quick tune search: always-visible text input, live "N / 66" count
- `localStorage` preference persistence (`cp_songbook_v7_prefs`)
- Keyboard shortcuts: `Space` = play/stop, `Esc` = stop all, `R` = random, `G` = generate
- Toast notification system: non-blocking, auto-dismiss, 5-stack, slide-in animation
- Dark-theme scrollbar, smooth `.bar.playing` transition, `audioReadyPop` animation
- `@media (max-width: 480px)` breakpoint for very small screens

---

## Files Modified / Added

| File | Description |
|------|-------------|
| `index.html` | All features above; ~6,500 lines. Single entry point. |
| `js/pitch-processor.js` | AudioWorklet YIN pitch detection processor |
| `service-worker.js` | PWA cache-first service worker |
| `manifest.json` | PWA manifest (name, icons, display mode) |
| `icons/icon.svg` | Treble clef SVG app icon |
| `CLAUDE.md` | This file |

---

## Key Implementation Notes

### `const` vs `window.*`
Top-level `const` declarations in a `<script>` tag are NOT properties of `window`. Accessing them via `window.SONGS`, `window.NOTE_IDX` etc. returns `undefined`. Always access them directly by name from code in the same script scope.

### AlphaTab Module Pattern
`alphaTabNotationModule` is an IIFE that captures `NOTE_IDX`, `SONGS`, `canonicalTuneTitle`, and `TITLE_ALIAS_MAP` from the enclosing scope. All transposition and key-lookup logic must use direct variable access, not `window.*` guards.

### Fretboard Engine String Mapping
`STRING_NOTES = ['E','B','G','D','A','E']` where index 0 = high E (display row 0, top). Engine string number = `6 - si` (display row index). So high E = engine string 6, low E = engine string 1.

### Practice Journal Weighted Random
The `#randomTune` click handler is registered with `{capture: true}` and calls `e.stopImmediatePropagation()` to fire before the original bubble-phase handler. It only acts when session data exists; otherwise it passes through. A `MutationObserver` on `#tuneSel` re-runs `annotateDropdown()` whenever `populateTuneDropdown()` rebuilds the options.

### Service Worker Cache Version
Increment `CACHE = 'cp-songbook-vN'` in `service-worker.js` whenever any app shell file changes. The activate handler deletes all caches not matching the current version string.

---

## Current Song Count

| Source | Count |
|--------|-------|
| Core SONGS object | 22 |
| OMNIBOOK_ADDITIONS | 44 |
| **Total unique tunes** | **66** |

---

*Last updated: 2026-05-19*  
*Active branch: `claude/alphatab-notation-integration-QkYOX`*
