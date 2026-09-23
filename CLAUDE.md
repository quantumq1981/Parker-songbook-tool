# CLAUDE.md — Parker Songbook Tool: Complete Development Log

## Project Overview

**Application:** Charlie Parker Songbook Trainer  
**Version:** 7.0 → 7.3 (UX Refactor Edition)  
**Tech Stack:** Vanilla JavaScript SPA, pure CSS, no build system  
**Entry Point:** `index.html` (single file, ~8,000 lines)  
**Active Branch:** `claude/ux-ui-audit-analysis-57f4db` (merged to `main` as PR #148)

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
- **67 total songs** (22 core SONGS object + 45 OMNIBOOK_ADDITIONS)

---

## Song Library (66 Total)

### Core SONGS (22)
Anthropology, Au Privave, Barbados, Billie's Bounce, Bloomdido, Blues for Alice, Cheryl, Chi Chi, Confirmation, Dewey Square, Donna Lee, Ko-Ko, Moose the Mooche, Now's the Time, Ornithology, Relaxin' at Camarillo, Scrapple from the Apple, Yardbird Suite, Parker's Mood, Embraceable You, Oh, Lady Be Good, Crazeology

### Omnibook Additions (45)
An Oscar for Treadwell, Another Hairdo, Back Home Blues, Bird Gets the Worm, Blue Bird, Buzzy, Card Board, Celerity, Chasing the Bird, Cosmic Rays, Diverse, KC Blues, Kim, Laird Baird, Marmaduke, Mohawk, My Little Suede Shoes, Passport, Perhaps, Red Cross, Relaxing With Lee, Segment, Shawnuff, Si Si, Steeplechase, The Bird, Thriving From a Riff, Visa, Warming Up a Riff, Ah-Leu-Cha, Cool Blues, Constellation, Celebrity, Drifting on a Reed, Leap Frog, Little Willie Leaps, The Hymn, Stupendous, Bongo Bop, Lover Man, Quasimodo, Salt Peanuts, Tiny's Tempo, Meandering, Bebop

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

### 8. Guitar Pro Uploads Never Played the Melody
**Issue (3 compounding bugs):**
1. The `#importFileInput` `accept=".xml,.mxl,.mid,.midi,.gp,.gp3,.gp4,.gp5,.gp7,.gpx"` filter caused iOS Safari to grey out GP files (it doesn't recognise those extensions/MIME types), so only `.xml`/`.midi` could be selected — matching the report that "it only accepts XML and MIDI."
2. `handleImportFile` routed modern zip-based `.gp` (GP6/7/8 containers) into the **legacy binary** `parseGPHeader` path and only ever produced a junk placeholder progression (`CΔ7 Am7 Dm7 G7`) — the melody was never loaded.
3. The `attachImportHook` that was meant to load GP into the alphaTab Heads player was effectively dead: the importer's own `change` listener calls `fileInput.value = ''` first, clearing the `FileList` before the hook reads it.

**Fix:**
- Removed the `accept` attribute (extension is still validated in `handleImportFile`).
- Rewrote the GP branch in `handleImportFile` to cover `gp/gp3/gp4/gp5/gp6/gp7/gpx`, detect the container type via the `PK` (zip) magic bytes, extract a title (gpif `<Title>` for zip, `parseGPHeader` for binary), and load the **actual transcription** into the player via the new `window.hdLoadArrayBuffer(buf, name)` — so the melody plays accurately. No more junk placeholder progression.
- Added `window.hdLoadArrayBuffer` to `alphaTabHeadsModule` (refactored out of `attachImportHook`); `api.load()` auto-detects the format. Works for drag-drop **and** click-to-browse.
- Scoped `attachImportHook` to `xml`/`mxl` only so GP can't be double-loaded.

### 9. Confirmation Head Crashed alphaTab (`t.staves`)
**Issue:** The bundled `docs/Charlie Parker - Confirmation.gp` was a 2-track GP7 file that threw `undefined is not an object (evaluating 't.staves')` in the alphaTab renderer — the head showed chords but never the melody.  
**Fix:** Replaced it with the user-supplied single-track, alphaTab-authored GP8 transcription of the Confirmation head (clean melody track that loads and plays reliably). `OMNIBOOK_TUNES`'s `Confirmation` entry already points at this filename.

### 11. Parker Heads Library — Blank Manuscript for 4 Tunes + "Bebop" Missing Entirely
**Reported (2026-09-04):** A handful of Parker Heads library entries opened with an empty staff — time signature but zero notes — and the Dizzy Gillespie / Charlie Parker head "Bebop" was not in the library at all.

**Root cause:**
- `An Oscar for Treadwell` and `Passport` were mapped to `omnibook_xml/*.xml` chord-chart stubs (rhythm-slash notation, no melody data), and `Cool Blues` and `Tiny's Tempo` were mapped to `alphatex/*.alphatex` chord charts. In every case the underlying source file contains chords only — hence the blank staff.
- `Bebop` had no entry anywhere: not in `OMNIBOOK_ADDITIONS`, not in either `OMNIBOOK_TUNES` array.

**Fix:**
- Added 5 user-supplied Guitar Pro transcriptions (full melody tracks) under `docs/`:
  `Charlie Parker - An Oscar For Treadwell.gp`, `Charlie Parker - Cool Blues.gp`, `Charlie Parker - Passport.gp`, `Charlie Parker - Tinys Tempo.gp`, `Charlie Parker - Bebop.gp5`.
- Repointed the four existing `OMNIBOOK_TUNES` entries (in BOTH the Heads Library array at `index.html:6443` AND the Notation Viewer array at `index.html:7302`) from the empty XML/alphatex stubs to the new `.gp/.gp5` files. AlphaTab auto-detects format from headers, so no format-specific loader code is needed.
- Added a new `Bebop` entry to `OMNIBOOK_ADDITIONS` (F major, 32-bar AABA, Advanced) so the tune appears in the songbook dropdown, plus a matching `Bebop` entry in both `OMNIBOOK_TUNES` arrays so its melody loads in the Heads Library and Notation Viewer.

Songbook total went from 66 → 67.

### 10. Duplicate `id="practicePanel"` — Invalid HTML, Silently Broken Dashboard Refresh
**Location:** `index.html` lines ~1062 and ~1360 (v7.2)  
**Issue:** Two different `<details>` elements shared the identifier `practicePanel` — the simplified session tracker at the top of the card and the drills/suggestions dashboard near the bottom. Because `getElementById` returns only the first match, the `toggle` listener that lazily rendered the dashboard was silently wired to the wrong panel, and the "refresh on session save" gate in `stopSession()` checked `.open` on the wrong element.  
**Fix (PR #148):** Renamed the second element to `id="practiceDrillsPanel"`. Updated both querySelector references (`index.html:5722` in `stopSession`, `index.html:5898` in the toggle listener) to point at the renamed element. HTML is now valid; the drills dashboard refresh gate now checks the correct panel.

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

### 7. UX v7.3 Refactor — Workflow Modes, Global Transport, Standardized Toggles (PR #148)

Resolves the four highest-priority UX gaps identified in the ISO 9241-11 / ISO 25010 audit of v7.2 without touching audio pipelines or existing feature JS. Single commit, `+841 / −65` in `index.html`; all 5 test suites pass.

#### 7a. Workflow-Based Progressive Disclosure
- New `.mode-nav` tablist above the fold with four workflow modes:
  - **📖 Learn** — Chord grid, chord-scale analysis, fretboard, voice leading
  - **🎯 Practice** — AlphaTab Notation / Tab, Parker Heads player, fretboard
  - **🎸 Improvise** — Resonance Engine, Section Lick Generator, Scale Library, fretboard
  - **📊 Journal** — Practice session tracker, drills / suggestions, Practice Tips card
- Panels tagged with `data-modes="learn practice …"`; `body[data-active-mode="…"]` CSS uses `display: revert` so legacy inline `style.display` (used by tab-view switches) still overrides for in-mode transitions.
- Auto-stops any active transport on mode switch to prevent audible collisions.
- Last-active mode persisted to `localStorage` key `cp_active_mode_v73`.
- Practice Tips converted from a single run-on paragraph into a `.tips-card` with tagged rows (Theory / Focus / Tempo / Fretboard / Audio / Explore), a keyboard-shortcut row, and a difficulty-legend row.

#### 7b. Unified Sticky Global Transport (`.global-transport`)
- Single Play / Stop / Loop plus BPM and Speed at the bottom of the main card (sticky).
- `routePlay()` dispatches to the correct legacy button by active mode:
  - **Learn** → `#playBtn` (chord grid playback)
  - **Practice** → `#atMainPlayBtn` when Notation / Tab view is active, else `#headPlayBtn`
  - **Improvise** → `#resonancePlayBtn`
  - **Journal** → transport disabled (no playback target)
- `routeStop()` broadcasts to every legacy stop button so nothing lingers across modes.
- BPM ↔ Speed sync bidirectionally with legacy `#bpmInput`, `#hdSpeedSlider`, and `#atMainSpeedSlider` via `dispatchEvent(new Event('input'|'change'))` — legacy handlers stay untouched.
- Blocking `.audio-consent-overlay` gates transport until the user acknowledges audio; dismisses on first user gesture and the existing document-level `unlockAudio` handler still fires on the same event, so the `AudioContext.resume()` gesture is preserved.
- Space / Escape captured with `stopImmediatePropagation()` so the legacy Learn-only `kbShortcuts` handler at `index.html:5132` never double-fires in Practice / Improvise modes.

#### 7c. Standardized Toggle Pill Pattern (`aria-pressed`)
- New `.toggle-pill` CSS pattern with an immutable text label and a sliding switch driven entirely by `aria-pressed`.
- Applied to: `metroBtn`, `tempoTrainerBtn`, `toggleResonance`, `togglePitch`, `resonanceArrowsBtn`, `resonanceAutoPlayBtn`, and the new `gtLoopBtn`.
- A per-button `MutationObserver` reads the legacy `e.target.textContent` mutation and translates it into `aria-pressed="true|false"`, then restores the static label from `data-toggle-label` — legacy click handlers keep working unchanged.
- Explicit three-tier heading utility classes (`.h-mode` / `.h-panel` / `.h-sub`) applied to the mode heading and panel `<h3>`s so parent panels no longer render as visual siblings of their child components.
- Removed text-swap state encoding (`"Loop: OFF"` → `"Loop: ON"`); the visible label is always `"Loop"`, and state lives in colour + switch position.

#### 7d. Prerequisite Hints + ARIA Live Tiering
- Section Lick post-actions (`Save TAB` / `ZIP` / `Preview`) changed from `display: none` to `disabled` + `aria-disabled="true"` with a visible `.prerequisite-hint` reading "Generate a section first"; hint clears and buttons enable after Generate produces output.
- Resonance Engine panel gets a "Select a bar in Learn mode to unlock lick generation" hint that toggles from the shared `lastBarData` state on every bar click.
- Toast container downgraded from `role="alert"` / `aria-live="assertive"` → `role="status"` / `aria-live="polite"`; a wrapper around `showToast()` re-elevates the container to `assertive` only for `type === 'error'`.

### 8. Real-Time Practice Enhancements v7.4

Seven real-time practice features plus pitch scoring, implemented as four pure JS modules (`js/pitchScoring.js`, `js/tempoRamp.js`, `js/silentBars.js`, `js/callResponse.js`) with UI integration in the `practiceEnhancements()` IIFE in `index.html`.

#### 8a. Tempo Ramp in Loop
- `TempoRamp.createRamp({ start, target, step, passesPerStep })` tracks clean loop passes
- On each loop boundary `_ramp.pass(clean)` returns `{ bpm, event, passes }`: `hold` (counting), `advance` (+step BPM), `backoff` (−step on fail), `target` (reached goal)
- UI: `#tempoRampBtn` toggle pill + `#rampControls` div (start/target/step/passes inputs)
- Ramp only activates when looping is enabled; toasts report advances/backoffs/target reached
- `_lastPassClean` flag set `false` by any outside-note detection in `onFrequency()`

#### 8b. Silent Bars (Ear Training)
- `SilentBars.buildMask(barCount, mode, density, pass)` returns `boolean[]` (true = audible)
- 5 modes: `off`, `alternate` (pairs), `lastHalf`, `random` (density param), `progressive` (ramps with loop pass)
- UI: `#silentBarMode` select in playback options row
- `tick()` checks `_barMask[playIdx]`; muted bars get `.bar-muted` CSS class (striped gradient)
- Metronome always fires regardless of `audible` flag — the core ear-training mechanic

#### 8c. Look-Ahead Guide Tones
- `tick()` computes `nextBarData` from `bars[playIdx+1]` on every bar advance
- `showFretboard()` overlays next bar's guide tones with `.gt-next` class (dashed cyan stroke, `→` glyph)
- `#gtTarget` banner shows "Cm7 → F7" voice-leading direction
- UI: `#lookAheadBtn` toggle pill; `showLookAhead` state variable

#### 8d. Beat Pulse on Bar
- Active bar receives `.bar-beat` class with `@keyframes barPulse` (scale 1→1.04→1, box-shadow glow)
- Animation duration set to bar duration (`(60/bpm)*4` seconds) for tempo-synced pulse
- Class cleared on `stopPlayback()` along with `.bar-muted`

#### 8e. Call & Response
- `CallResponse.createMatcher(targetPcs, { skipTolerance })` — streaming pitch matcher
- `feed(pc)` returns `'progress'|'ignore'|'complete'`; skip tolerance allows one missed note
- `crCycle()` async state machine: `CALLING` (app plays lick via resonance) → `LISTENING` (mic captures player response) → `JUDGING` (compare via matcher accuracy) with timeout fallback
- UI: `#gtCallResponseBtn` button + `#crStatus` display in global transport
- Integrates with existing pitch detection: `onFrequency()` feeds detected PCs to `_crMatcher`

#### 8f. Stand Mode
- `body.stand-mode` CSS: hides most detail panels but keeps the Scale Library available in Improvise; enlarges chord cells to 1.45×, 120px min bar height
- `navigator.wakeLock.request('screen')` prevents display sleep; re-acquires on `visibilitychange`
- UI: `#gtStandModeBtn` toggle in global transport
- `enterStandMode()` / `exitStandMode()` functions with graceful fallback when Wake Lock API unavailable

#### 8g. Per-Chorus Modulation
- `MOD_CYCLES` map: `fourths` (+5), `minor3rd` (+3), `halfStep` (+1), `random`
- `_keyStep` accumulates semitones at each loop boundary when `modulateEnabled`
- Calls `renderLeadSheet()` with transposed root, then re-acquires `bars` (hence `let bars` in `startPlayback`)
- UI: `#modulateBtn` toggle pill + `#modulateCycle` select (4 cycle options)

#### 8h. Pitch Scoring Integration
- `PitchScoring.gradeNote(pc, cents, chordPcs, scalePcs, guidePcs)` classifies each pitch
- Categories: `guideTone` (1.25×), `chordTone` (1.0×), `scaleTone` (0.6×), `outside` (0×)
- Intonation: linear 1→0 falloff from ±10¢ to ±50¢
- `scoreBar(grades)` returns weighted 0–100 score or null for empty bars
- `_barGrades[]` collects grades per bar; outside notes flag `_lastPassClean = false` for tempo ramp

### 9. Deep-Link Routing v7.5 (R1 — UX audit follow-up)

Serializes the four navigation axes — `{mode, tune, key, view}` — into `location.hash`, so any app
state is bookmarkable, refresh-durable, and shareable (the enabling feature for the README's
"For Educators" link-sharing story). Single additive commit, `+128 / −0` in `index.html`; no audio
or render logic touched.

- **Hash format:** query-style `#mode=learn&tune=Now%27s+the+Time&key=Bb&view=grid`. Order-independent
  and encoding-safe — `URLSearchParams` on both ends round-trips apostrophes/commas/spaces symmetrically
  (verified against `Now's the Time`, `Oh, Lady Be Good`, `Relaxin' at Camarillo`), so no slug↔title map.
- **Router-not-replacer:** inbound state drives the *existing* pipelines — set `tuneSel.value` + dispatch
  `change`, set `keySel.value` + dispatch `change`, call `window.__cpApplyMode` / `window.__cpApplyView`.
  No render/audio reimplementation, consistent with the v7.3 global-transport pattern.
- **Two new window hooks** (same idiom as `hdLoadArrayBuffer` / `reportTransportState`): `__cpApplyMode`
  (= `setActiveMode`, exposed from the v7.3 IIFE) and `__cpApplyView` / `__cpGetView` (= `switchView` /
  `currentView`, exposed from the AlphaTab IIFE). The router IIFE lives at the end of the main script and
  reaches these axes only through the hooks — no scope surgery.
- **Precedence:** hash **wins** over `cp_songbook_v7_prefs` on load (a shared link overrides the
  recipient's last session). No hash → existing prefs restore is untouched, then the URL is seeded from
  restored state so it is always shareable.
- **Outbound** writes use `history.replaceState` (no history spam, does not fire `hashchange`) via a
  next-tick debounce, on additive `change`/`click` listeners and `cp:navigation` events from the mode/view setters. The router ignores events until `load` so preference restoration cannot replace an incoming shared hash. **Inbound** `applyHash` runs on `hashchange`
  (manual edits / bookmarks) and once on `window.load` (after mode init, `_loadAndApplyPrefs`, and all
  DOMContentLoaded wiring have settled).
- **Edge cases:** invalid tune (not in `SONGS` after `canonicalTuneTitle`) → ignored; invalid key (no
  matching `<option>`) → ignored; invalid mode → `setActiveMode` defaults to `learn`; invalid view →
  guarded to `grid|notation|tab`; apply→change→write→apply re-entrancy → `_applyingHash` flag; all apply
  work wrapped in `try/catch`. Back/forward is a deliberate non-goal (avoids a back-stack entry per
  key-cycle).

### 10. Two-Tier Navigation Disambiguation v7.6 (R2 — UX audit follow-up)

Resolves the "is this a fifth mode?" ambiguity between the workflow `mode-nav`
(Learn / Practice / Improvise / Journal) and the lead-sheet view tabs
(Chord Grid / Notation / Tab), which previously rendered as visual peers — both
`role="tablist"`, both rounded-pill rows at similar altitude. CSS + markup only,
no JS logic touched.

- **Segmented control, not a peer tablist:** the view tabs are wrapped in a new
  `.sheet-view-header` bar carrying a `"Lead sheet view"` label + a compact
  connected `.seg-control` (single bordered track, dividers between buttons,
  squared bottom to fuse into the panel below). Deliberately quieter and smaller
  than the large uppercase gradient mode pills, so it reads as a subordinate of
  the active mode.
- **Cascade correctness:** `data-modes="learn practice"` moved from the inner
  `#atViewTabs` to the `.sheet-view-header` wrapper, freeing the inner control
  from the progressive-disclosure cascade (its `display:inline-flex` now applies
  unconditionally). The header's in-mode `display:flex` is set via
  separate `body[data-active-mode="learn"]` and `body[data-active-mode="practice"]` rules to outrank the
  `[data-modes]` reveal's `display:revert` (~0,2,1) — the same specificity trick
  documented for `nav.mode-nav` and the `.playback-bar[data-modes]` stub.
- **ARIA:** `#sheet` is now a proper `role="tabpanel"` (`aria-labelledby="atTabGrid"`)
  — both view-tab targets are tabpanels (`#alphatab-container` already was); the
  view `role="tablist"` is labelled by the visible `#sheetViewLabel`. The
  `mode-nav` remains a landmark-scoped tablist over `#main-content` (progressive
  disclosure across one shared region, not classic swappable panels), left as-is.
- **Compatibility:** all button ids / `data-view` / `.at-view-tab` classes are
  unchanged, so `switchView`, `atNotInit`, and the R1 deep-link router
  (`__cpGetView` / `__cpApplyView` + `.at-view-tab` click listeners) keep working
  untouched. Verified by headless Chromium screenshot.

### 11. First-Run Guided Tour v7.7 (R3 — UX audit follow-up)

A dismissible, six-step walkthrough that orients new users to the four workflow
modes, tune search, the lead-sheet view switcher, and the global transport.
Additive overlay only (CSS + one markup button + one JS IIFE); no pipeline JS
touched.

- Auto-starts once — gated on `localStorage` key `cp_tour_seen_v76` — and only
  after the audio-consent gate clears (a `MutationObserver` on `body.audio-ready`)
  so the two overlays never stack. Reopenable anytime via the `#tourBtn` (❓ Tour,
  anchored top-right of the now-`position:relative` `.card`).
- Built in JS at runtime: a `.tour-backdrop` dims the page, the referenced control
  is "lifted" with a ring (`.tour-lift`, save/restore of inline `position`+`zIndex`
  so sticky elements like `.mode-nav` / `.global-transport` are not disturbed),
  and a `.tour-card` shows step title/body + progress dots + Back/Next/Skip.
- Accessibility: `role="dialog"` + `aria-modal`, `Esc` closes, `←/→` navigate,
  focus moves to the primary button and is restored on close. A one-line guard in
  the v7.3 Space/Escape transport handler yields those keys while the tour is open.
- All copy is static (no dynamic `innerHTML`). Step 4 references `.sheet-view-header`
  and switches to Learn mode first (`window.__cpApplyMode`).

### 12. Practice-Journal Store Reconciliation v7.7 (R4 — UX audit follow-up)

Resolves the long-standing two-database divergence (`cp_practice_v1` drills vs
`cp_practice_db` journal) that made the two dashboards disagree, and adds a
cross-device continuity seam.

- **Pure, headless-tested core** `js/practiceStore.js`: `normalizeSession()`
  coerces both record shapes into one superset (keeps drills' `startTime` AND
  journal's `ts`/`date`), and `mergeStores()`/`dedupe()` collapse a session logged
  in both stores into one via **interval-overlap** matching (same tune +
  overlapping `[startTime, ts]`), keeping the longer-duration record. "Migrate,
  don't drop": a session in only one store survives; idempotent. Covered by
  `tests/practiceStore.test.js`.
- **Unified read model** `window.cpGetAllSessions()` merges both stores through
  the tested merger; both `refreshDashboard` (drills) and `refreshJournal`
  (journal) — and CSV export — now read it, so every view shows one reconciled
  timeline. Live write paths are deliberately left untouched (lower risk than a
  physical migration); the normalized superset keeps every existing field read
  working, and both stores expose their reader (`__cpStoreA_getAll` /
  `__cpStoreB_getAll` + `__cpStoreB_add`) on `window`.
- **JSON Backup / Restore** (`#pjExportJsonBtn` / `#pjImportJsonBtn`): backup dumps
  the reconciled timeline; restore merges a backup into the canonical journal
  store, adding only sessions not already present (idempotent). Download reuses the
  existing proven `Blob` + `a.download` path — **no CSP change**.

### 13. Per-Tune Reference Recordings v7.7 (R5 — UX audit follow-up)

A "🔊 Hear the head" affordance under the lead sheet (Learn / Practice) with
YouTube and Spotify search link-outs for the current tune.

- **CSP-safe by design**: external `<a target="_blank" rel="noopener noreferrer">`
  navigations, not embeds. The app's locked-down CSP (`default-src 'self'`, no
  `frame-src`) and "audio stays local" posture are untouched — nothing is fetched
  into the page and no CSP directive is loosened. (An embedded player would require
  both CSP loosening and curated per-tune IDs; deliberately not done — noted as a
  future option.)
- Needs no curated data: `referenceLinks()` rebuilds each `href` from
  `canonicalTuneTitle(tuneSel.value)` on load and on every tune change
  (`…/results?search_query=` and `open.spotify.com/search/` with an
  `encodeURIComponent`d query), so it works for all 67 tunes.
- `.ref-row` uses the same `body[data-active-mode] .ref-row[data-modes]{display:flex}`
  specificity trick as R2's header to survive the progressive-disclosure cascade.

### 14. Uploaded Reference Audio v7.8 (R5.1 — user request)

Extends R5 so a user can attach **their own MP3** as a tune's reference recording
and play it inline — not just search external services.

- **Per-tune, persistent, device-local:** an "⬆ Upload MP3" control stores the
  picked file (as a Blob) in a dedicated IndexedDB database `cp_reference_audio`
  (store `clips`, keyed by canonical tune name — one clip per tune, replace on
  re-upload). On tune change (including R1 deep-link / prefs restore, which
  dispatch `change`) the clip for that tune is loaded and shown in a native
  `<audio controls>`; a ✕ Remove button deletes it. Nothing is uploaded anywhere.
- **CSP-safe:** playback uses a `blob:` object URL, already permitted by the
  page CSP's `media-src 'self' blob:` — **no CSP change**. `data:` URLs are
  deliberately avoided (not in `media-src`). Object URLs are revoked on every
  swap/clear to avoid leaks; a stale async read is ignored via a `_loadedTune`
  guard.
- **Graceful degradation:** if IndexedDB is unavailable (e.g. private mode) the
  clip still plays for the session, with a toast that it could not be saved.
- **Pure, tested validation:** `js/referenceAudio.js` `isAcceptableAudio()` gates
  by MIME type *or* extension (empty-type `.mp3` accepted), rejects non-audio,
  empty, and oversized (>30 MB) files. `tests/referenceAudio.test.js` covers all
  branches. DOM + IndexedDB wiring stays inline (matching the practiceStore
  pure-core / inline-IDB split).
- `.ref-player-row` is revealed only in-mode AND when a clip exists via
  `body[data-active-mode] .ref-player-row[data-modes]:not(.ra-empty){display:flex}`,
  so an empty player never occupies space.

### 15. Bebop Swing Groove Engine v7.9 (user request — "make it swing")

Replaces the naïve `audioMode === 'bebop'` backing track with a data-driven,
headless rhythm-section engine so the generated chord grid / MIDI chord player
actually swings. **werckmeister / Scaler / ChordPrism cannot be embedded** (C++
standalone / commercial VST — neither loads in a zero-build vanilla-JS SPA under
`default-src 'self'`); what's portable is the *concept* — a "feel" (style) table
that maps a chord → rhythmically-placed events — reimplemented natively. No CDN,
no binary, no CSP change, no build step.

- **Pure, tested core** `js/bebopGroove.js`: `buildBarPlan({root, chord, nextRoot,
  bpm, barIndex, feel, prevBassMidi, prevCompTop, seed})` returns a typed event
  plan `{swing, events[]}` where each event is
  `{voice, beat, eighth, midi, dur, vel, micro}` (positions in beats; renderer
  converts to seconds). Zero audio code → 100% headless-testable
  (`tests/bebopGroove.test.js`).
- **Three authenticity wins over the old fixed engine:**
  1. **Walking bass that leads.** Beats 1–3 are root/fifth/bridging chord tone;
     **beat 4 is a chromatic half-step approach into the *next* bar's root** — the
     defining move of a walking line, structurally impossible before because the
     old engine had no look-ahead. Octaves are placed nearest the previous note
     for a tight contour (`_bbPrevBassMidi` carried bar-to-bar).
  2. **Tempo-adaptive swing.** `swingRatio(bpm, feel)` interpolates a triplet-ish
     ~0.66 at slow tempos toward ~0.54 as tempo climbs (bebop straightens when
     fast) — replaces the fixed `sw = 0.64`.
  3. **Varied, humanized comping.** Guide-tone (3rd/7th/9th) rootless voicings,
     voice-led near the previous top note; a weighted pick among comp rhythm
     patterns (sparse / and-2-and-4 / Charleston / push / anticipate); per-hit
     velocity + behind-the-beat micro-timing from a **seeded PRNG** (mulberry32)
     so output is reproducible → testable.
- **Feel selector (the werckmeister "style" analogue):** `#bebopFeel` (Medium
  Swing / Up-tempo / Ballad) in the playback-options row drives swing curve, ride
  pattern (spang-a-lang vs sparse), comp density and kick feel. Persisted
  device-local to `localStorage` key `cp_bebop_feel_v79`.
- **Router-not-replacer integration:** `playBebopBackingBar()` is now a dumb
  renderer that dispatches plan events to the existing `_bbRide/_bbHihat/_bbKick/
  _bbBassNote` synths + a new per-voice `_bbCompNote`; the `tick()` loop feeds
  `bars[playIdx+1]` as `nextRoot/nextChord` (loop-aware) plus a bar counter. State
  (`_bbPrevBassMidi`, `_bbPrevCompTop`, `_bbBarCounter`, `_bbSeed`) resets in
  `startPlayback`/`stopPlayback`. Events scheduled in the past are dropped.
- Verified headlessly (Chromium): page loads with zero console errors, swing
  0.646@120 → 0.58@280 BPM, and beat-4 bass resolves a half-step into the next
  root. Service-worker shell updated (`bebopGroove.js` added; cache `v7`→`v8`).

### 16. "After Hours" Photo Backdrop v7.10 (user request — app background image)

Adds a Charlie Parker performance photo as the app's ambient background, folded
into the *existing* fixed backdrop layer rather than bolted on as a new one.
CSS + one asset + SW shell only; no pipeline JS touched.

- **Asset discipline:** the source upload was an 8.1 MB / 2160×3840 PNG — a
  non-starter as a web background. Downscaled to 1080×1920 and re-encoded as a
  progressive JPEG (`images/bg-parker.jpg`, **224 KB**, ~36× smaller; no alpha
  channel needed). One asset, `cover`-scaled, serves every viewport.
- **Router-not-replacer for the backdrop:** the photo is added as a layer inside
  the pre-existing `body::before` fixed, GPU-composited backdrop (the one that
  deliberately avoids `background-attachment:fixed` to dodge iOS scroll jank), not
  a new stacking layer. Layer order (topmost first): the signature brass/orchid/
  teal radial glows → a dark tint gradient `rgba(16,13,20,.52)→(11,9,14,.82)` for
  text readability → `url('images/bg-parker.jpg') center top / cover` → **the
  original opaque gradient, retained as the bottom layer** so the backdrop renders
  byte-identically to v7.9 if the photo ever fails to load (offline first-visit,
  404, CSP) — zero-regression graceful degradation.
- **Readability by construction:** `.card` panels are ~96% opaque and
  `.global-transport` carries its own opaque gradient, so the only text sitting
  directly on the backdrop is the hero (large shadowed title, pilled kicker,
  light-on-dark tagline). The tint is tuned so the sax player reads clearly in the
  hero and gutters while all hero text stays legible.
- **CSP-safe:** same-origin CSS `url()` is already covered by the page CSP's
  `img-src 'self'` — **no CSP change**. Added to the SW `SHELL` and bumped cache
  `v8`→`v9` so the backdrop is offline-durable.
- Verified headlessly (Chromium, desktop 1280×900 + mobile 390×844): image serves
  200, zero console errors, no failed requests; the figure is visible behind the
  hero/gutters with hero copy still readable.

### 17. Chord Voicings & Substitutions Overhaul v7.11 (user request — "of very little use")

Replaces the anemic chord-voicings pop-up (one transposed shell per chord, some
grids blank, boxes cut off) with a real voicing browser + a theory-driven
reharmonization engine. Business logic is fully isolated into pure, headless,
unit-tested modules; the DOM/renderer only consumes their canonical output.

**Root causes fixed (all three real bugs):**
1. **The 13-entry `jazzChordDatabase.js` shadowed the rich data.** `getChordVoicings`
   only fell back to `data/chords.json` (the vendored tombatossals DB — 4–5 real
   voicings per chord, each with a `midi` array) when the jazz DB had *nothing*;
   transposition almost always produced *something*, so the good data was never
   reached → the "1 voicings" truncation.
2. **`chords.json` voicings rendered blank.** `renderJazzVoicing` never converted
   the DB's flat `frets:[loE..hiE]` array into `[string,fret]` tuples, so those
   positions drew an empty grid (the blank `Bbm7/Eb7` box).
3. **ii–V pairs silently dropped half the chord.** `"Bbm7/Eb7"` was `split('/')`-ed
   and only `Bbm7` was ever looked up.

**New pure modules (Phase-2, headless-tested):**
- `js/voicingLibrary.js` — converts each `chords.json` position into a canonical,
  interval-labeled voicing (`R/3/5/b7` gold dots derived from open-string MIDI +
  fret geometry — works for all 12 keys × all suffixes, no reliance on the DB's own
  `midi`), merges the curated jazz shells first, dedupes by fret signature, sorts by
  neck position, caps the count. **Validates every voicing against the chord's real
  pitch-class set** (`ALLOWED_INTERVALS`) and drops junk — the shipped DB has a few
  mis-filed grips (e.g. an `Am7` shape under `Bbm7 pos0`). Tests reconstruct the DB's
  own `midi` from our geometry to prove the conversion, and assert the corrupt grip
  is rejected.
- `js/chordSubstitutions.js` — `getSubstitutions(root, quality)` → ranked, reasoned
  reharm options. Dominants → **tritone sub (bII7)**, **°7 on the 3rd (rootless b9)**,
  **m7b5 on the 3rd (rootless 9)**, related ii; **m11 ⇄ 7sus4** (a P4 apart, +5/+7);
  relative maj/min (Cmaj7⇄Am7, m7⇄maj6); minor ii–V (m7b5→V7b9). `classifyQuality`
  maps any suffix to a family. All the substitutions the request named are covered.

**Wiring / UI (Phase-3, router-not-replacer):**
- `ChordDataService.getRichVoicings(key, suffix)` = jazz shells + `VoicingLibrary`
  over `chords.json`; legacy `getChordVoicings` kept as a fallback. The tests that
  pin `getJazzVoicingsForChord` / `filterJazzVoicings` / `normalizeJazzSuffix` are
  untouched.
- `chordDiagram.js` hardened: renders canonical tuple voicings **and** legacy flat
  `frets` positions (bug 2 fix) — never an empty grid for a valid voicing.
- `chordVoicingsInit.js` `splitCompoundSymbol()` distinguishes a **ii–V/reharm pair**
  (`Bbm7/Eb7`, `Gm7/C7` — every part after `/` carries its own quality → voice BOTH)
  from a **slash/inversion bass** (`C/G`, `Cmaj7/E` — bare note after `/` → voice the
  left chord). Each chord gets its own block: voicings grid + clickable substitution
  chips that drill into the sub's own voicings.
- `chordVoicingsModal.js` rebuilt as a renderer of a structured `{title, chords[]}`
  payload; XSS-safe (`escapeHtml`), delegated sub-chip clicks, ARIA dialog + focus
  trap retained.
- **Cut-off fixed:** panel `max-height:92vh` with a sticky header and an internally
  scrolling body; tiles shrunk (150px SVG, `minmax(148px,1fr)` grid, `minmax(128px)`
  under 560px) so several voicings fit without the box overflowing the viewport.
- **Chord-dictionary parity + jazz bonus:** diagrams now render the fretting-hand
  **finger numbers** (1–4) from `chords.json.fingers`, **open (○) / muted (✕)
  markers** above the nut, and the base-fret label — matching a standard chord
  dictionary — with a header **Fingers ⇄ Intervals** segmented control that swaps the
  dot labels to `R/3/5/b7` (the theory view a plain dictionary lacks). `chords.json`
  is now used *alone* for common qualities (clean per-position names + real finger
  data); the curated jazz shells are a fallback only for qualities the library lacks.
  Substitution reasons are parameterized to the actual roots (e.g. "Bbm7 = Db6",
  "B°7 = rootless G7b9"), not fixed examples. Up to **8 shapes**, ordered open/low
  first. `buildDisplayVoicing()` in `chordDiagram.js` builds the exact SVGuitar
  `fingers` array (label choice + `[string,'x']` mutes) from a canonical voicing.
- No new CDN / library / CSP change (leverages the already-vendored `chords.json`
  and `svguitar.umd.js`). SW `SHELL` gains the two new modules; cache `v9`→`v10`.
- Verified headlessly (Chromium, 414×896): `Gm7` → **6 voicings / 4 subs** (was 1),
  `Bbm7/Eb7` → **10 voicings across both chords, 0 blank grids** (was 1 blank box),
  `G7b9` → 4 voicings + Db7/Bdim7/Bm7b5 subs, `Dm11` → 4 voicings + G7sus4 sub. No
  pipeline console errors.

### 18. Drop-2 / Drop-3 Voicing Generator + Fret Position Labels v7.12 (user request)

Positions the app as an advanced/conservatory jazz tool: instead of only the
dictionary shapes, it now *derives* the classic four-note jazz voicings from
theory, so every seventh-chord quality shows real drop-2 and drop-3 grips in all
inversions and string sets, in all 12 keys.

- **Pure generator** `js/dropVoicings.js` (`generate(root, suffix)`): builds the
  four close-position inversions of the chord's four-note core, applies the drop-2
  (2nd voice from top down an octave → adjacent strings) and drop-3 (3rd voice from
  top → one string skipped) transforms, then solves each onto the standard guitar
  string sets (drop-2: 6-5-4-3 / 5-4-3-2 / 4-3-2-1; drop-3: 6-4-3-2 / 5-3-2-1) with
  a compact-fingering search (span ≤ 5). Emits canonical voicings with interval
  labels, a distinct-fret finger heuristic, `group` ('Drop 2'/'Drop 3'), `bass`
  (which tone is lowest) and `stringSet`. Extended/altered qualities resolve to
  their seventh-chord core (`13`→`7`, `m11`→`m7`, …); triads/sus produce none.
  Zero DOM/IO → `tests/dropVoicings.test.js` proves chord spelling, 4 distinct
  tones, playability, the drop-3 string skip, and the drop-2 adjacency across
  qualities and keys.
- **Merged + grouped:** `getRichVoicings` now returns Library shapes (chords.json)
  **plus** generated Drop 2 / Drop 3, deduped by fret signature (library wins), each
  tagged with a `group`. The modal renders one labeled sub-section per group with a
  one-line explanation. A `Cmaj7` now shows ~15 voicings across the three groups.
- **Starting-fret label on every chart** (user request): `renderChordDiagram` draws
  an always-present fret badge (`open` / `Nfr`) in the tile's top-right corner, so
  the neck position is unambiguous even for open-position shapes (SVGuitar only
  prints its own marker for baseFret > 1). The **Fingers ⇄ Intervals** toggle drives
  the generated voicings too (finger heuristic vs. interval labels).
- **Guarantee ≥8 shapes** `js/shapeGenerator.js` (pure): the drop generator only
  covers seventh chords, so triads / 6ths / sus / add9 would otherwise show just the
  4–6 chords.json library shapes. This general enumerator walks each neck window ×
  each contiguous string block, keeps only real playable grips (contiguous sounding
  strings, all required tones present, only chord tones, span ≤ 4, ≤ 4 fingers, ≤ 4
  strings so the standard 5–6 string barre/open shapes stay the library's job), then
  ranks (complete, root-in-bass, fuller, lower) and diversifies across positions.
  `getRichVoicings` tops the Library group up to 8 with these only when
  `library + drops < 8`. `tests/shapeGenerator.test.js` proves spelling, required
  tones, playability, contiguity and position spread. A `C` triad now shows 8 grips
  spread open→10fr.
- No new CDN / library / CSP change. SW `SHELL` gains `js/dropVoicings.js` +
  `js/shapeGenerator.js`; cache `v10`→`v12`. Verified headlessly (Chromium, 414×896):
  `C` 8 / `Cmaj7` 15 / `Dm7` 16 / `G7` 16 voicings, a fret badge on every tile, 0
  blank grids, no pipeline console errors.
- **Next tier (not yet built):** rootless drop-2 of the *extended* upper structures
  (e.g. voicing a 13 as 3-13-b7-9 rather than the 7th core), and drop-2&4. Noted for
  a future pass; the current core covers standard drop-2/drop-3 comping.

---

## Files Modified / Added

| File | Description |
|------|-------------|
| `index.html` | All features above; ~8,000 lines. Single entry point. |
| `images/bg-parker.jpg` | Optimized (1080×1920, 224 KB) Charlie Parker photo used as the app background backdrop (v7.10) |
| `js/pitch-processor.js` | AudioWorklet YIN pitch detection processor |
| `js/pitchScoring.js` | Pitch scoring model — grades detected notes against bar's harmonic context |
| `js/tempoRamp.js` | Tempo ramp model — creeps BPM up/down per loop pass |
| `js/silentBars.js` | Silent bars mask generator — 5 modes for ear training |
| `js/callResponse.js` | Call & response matcher — streaming pitch matcher against target sequence |
| `js/bebopGroove.js` | Pure bebop rhythm-section engine — swing/walking-bass/comp event plan per bar (v7.9) |
| `tests/bebopGroove.test.js` | Unit tests for bebopGroove (swing, approach tone, guide tones, determinism) |
| `service-worker.js` | PWA cache-first service worker |
| `manifest.json` | PWA manifest (name, icons, display mode) |
| `icons/icon.svg` | Treble clef SVG app icon |
| `tests/practiceEnhancements.test.js` | Unit tests for pitchScoring, tempoRamp, silentBars, callResponse |
| `js/practiceStore.js` | Pure practice-session reconciliation — normalizes both store shapes, merges + dedupes into one timeline (R4) |
| `js/referenceAudio.js` | Pure validation for user-uploaded reference audio (accept/reject by type, extension, size) (R5.1) |
| `tests/referenceAudio.test.js` | Unit tests for referenceAudio.isAcceptableAudio |
| `tests/practiceStore.test.js` | Unit tests for practiceStore normalize/merge/dedupe/idempotency |
| `js/dropVoicings.js` | Pure drop-2/drop-3 generator — close-position inversions → drop transforms → string-set fretboard mapping (v7.12) |
| `tests/dropVoicings.test.js` | Unit tests — chord spelling, playability, drop-3 string skip, drop-2 adjacency across keys/qualities (v7.12) |
| `js/chordVoicingsModal.js` | + voicing-type grouping (Library/Drop 2/Drop 3) and per-tile starting-fret badge (v7.12) |
| `js/shapeGenerator.js` | Pure general voicing enumerator — playable 3–4 string grips across the neck; tops the Library group up to ≥8 shapes for triads/6ths/sus etc. (v7.12) |
| `tests/shapeGenerator.test.js` | Unit tests — spelling, required tones, playability, contiguity, position spread (v7.12) |
| `js/voicingLibrary.js` | Pure voicing normalizer — chords.json positions → canonical interval-labeled voicings, merge/dedupe/validate (v7.11) |
| `js/chordSubstitutions.js` | Pure reharmonization engine — tritone / diminished / half-dim / ii–V / m11⇄7sus4 / relative subs (v7.11) |
| `js/chordDataService.js` | + `getRichVoicings()` merges jazz shells + VoicingLibrary; legacy path retained (v7.11) |
| `js/chordDiagram.js` | Renderer hardened to draw legacy flat-`frets` positions, not just tuple voicings (v7.11) |
| `js/chordVoicingsModal.js` | Rebuilt: per-chord blocks (ii–V pairs), clickable substitutions panel, sticky header (v7.11) |
| `js/chordVoicingsInit.js` | + `splitCompoundSymbol()` (ii–V pair vs slash-bass), assembles voicings + subs payload (v7.11) |
| `tests/voicingLibrary.test.js` | Unit tests — midi-reconstruction proof, corrupt-grip rejection, dedupe/limit (v7.11) |
| `tests/chordSubstitutions.test.js` | Unit tests — tritone/dim/half-dim, m11⇄7sus4, relative, enharmonic roots (v7.11) |
| `tests/chordVoicingsInit.test.js` | Unit tests — ii–V pair vs slash-bass disambiguation (v7.11) |
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

### v7.3 Progressive Disclosure — Why `display: revert`
The `[data-modes]` CSS system starts every tagged element at `display: none` and then, via `body[data-active-mode="learn"] [data-modes~="learn"] { display: revert; }`, restores the browser default for the active mode. Feature panels use `.is-disarmed` to hide and remove it when armed. There is no unconditional `.is-armed { display: revert }`: that used to expose panels in unrelated modes. The lead-sheet switcher disarms the inactive tabpanel, and both tabpanels are eligible in Learn and Practice. Any display rules for flex rows must name the modes they belong to; a generic `body[data-active-mode]` selector leaks them into Journal/Improvise. Empty reference-audio rows remain hidden.

### Phase 1 navigation repair (2026-09-23)
- `#alphatab-container` now allows Learn and Practice, matching the visible Grid/Notation/Tab switcher. `switchView()` rejects invalid values and toggles both tabpanels with disarm classes, not an inline `display:none` on `#sheet`.
- The locked Resonance prompt switches to Learn **and** the chord grid before scrolling to the bar picker. Programmatic mode/view changes emit `cp:navigation` so the deep-link hash stays current, without overwriting a shared hash during startup.
- The PWA shell cache advances to `v13`. Phase 2 initialization coordination remains separate: the current first-party `defer` scripts, inline main script, lazy CDN loader, and IndexedDB entry points need an explicit readiness contract before a centralized coordinator can be installed safely. Preserve lazy CDNs or clearly account for startup cost and offline behavior when implementing that phase.

### Scale Library and structural audit follow-up (2026-09-23)
- `body.stand-mode details:not(.scale-lib)` keeps the 25-scale library available in Improvise. `#openScaleLibraryBtn` opens and scrolls to it from immediately below the mode tabs, including in Stand mode.
- Scale entries are native buttons with `aria-pressed`. Selection reuses the existing fretboard SVG instead of rebuilding it before repainting.
- Learn's global transport now routes to AlphaTab when Notation/Tab is selected; view and mode changes stop hidden notation playback and the transport label/state follows the active view.
- The current structural findings, confirmed behavior, and phased recommendations are in `docs/STRUCTURAL_AUDIT_2026-09-23.md`. Shell cache `v14`. Phase 2 coordinator remains proposed, not implemented.

### v7.3 Global Transport — Router-Not-Replacer Pattern
The global transport bar never reimplements audio pipelines. `routePlay()` / `routeStop()` call `.click()` on the pre-existing legacy buttons (`#playBtn`, `#headPlayBtn`, `#atMainPlayBtn`, `#resonancePlayBtn`, etc.), which keep their original handlers intact. The legacy buttons themselves are hidden (`display:none`) so users only see the unified transport, but their handlers keep firing exactly as before. Same principle for BPM / Speed: the global inputs write into the legacy inputs and `dispatchEvent()` the corresponding `input` / `change` event so downstream code (metronome, tempo trainer, AlphaTab `api.playbackSpeed`) reacts as it always did.

### v7.3 Duplicate-ID Fix — Renamed, Not Merged
The two `<details>` panels sharing `id="practicePanel"` served different features (session tracker vs drills / suggestions). The fix renames the second to `id="practiceDrillsPanel"` rather than merging the panels, so both features stay intact and the two references in JS (`stopSession`'s refresh gate + the lazy-render `toggle` listener) point at the correct element.

---

## Current Song Count

| Source | Count |
|--------|-------|
| Core SONGS object | 22 |
| OMNIBOOK_ADDITIONS | 45 |
| **Total unique tunes** | **67** |

---

---

## Version Timeline

| Version | Date | Highlights |
|---------|------|------------|
| 7.0 | 2026-04 | Baseline PRO Edition — 22 core SONGS, chord grid, fretboard, Resonance Engine |
| 7.1 | 2026-05 | Accessibility & UX pass — skip link, ARIA live regions, toasts, keyboard shortcuts |
| 7.2 | 2026-05 | AlphaTab notation + Guitar Pro loader; Parker Heads Library grows to 66 tunes; PWA + pitch detection |
| 7.3 | 2026-07-21 | UX refactor (PR #148) — workflow modes, unified global transport, standardized `aria-pressed` toggles, duplicate-ID fix, prerequisite hints, toast aria-live tiering |
| **7.4** | **2026-08-21** | **Real-time practice enhancements** — tempo ramp, silent bars, look-ahead guide tones, beat pulse, call & response, stand mode, per-chorus modulation, pitch scoring |
| **7.5** | **2026-09-09** | **Deep-link routing (R1)** — `{mode, tune, key, view}` serialized to `location.hash`; bookmarkable, refresh-durable, shareable state; router-not-replacer, `+128 / −0` in `index.html` |
| **7.6** | **2026-09-09** | **Two-tier nav disambiguation (R2)** — lead-sheet view tabs demoted to a labeled segmented control subordinate to the mode nav; `#sheet` given `role="tabpanel"`; CSS + markup only |
| **7.7** | **2026-09-09** | **R3+R4+R5** — first-run guided tour; practice-journal store reconciliation (`js/practiceStore.js`) + JSON backup/restore; per-tune YouTube/Spotify reference link-outs (CSP-safe) |
| **7.8** | **2026-09-09** | **R5.1** — upload your own MP3 as a per-tune reference recording; stored device-local per tune in IndexedDB, played inline via `blob:` (`js/referenceAudio.js`) |
| **7.9** | **2026-09-13** | **Bebop swing groove engine** — data-driven `js/bebopGroove.js`: walking bass with chromatic approach to the next root, tempo-adaptive swing, humanized/varied comping, feel selector (Medium/Up-tempo/Ballad). Native, CSP-safe analogue of werckmeister styles |
| **7.10** | **2026-09-13** | **"After Hours" photo backdrop** — Charlie Parker performance photo (`images/bg-parker.jpg`, 1080×1920, 224 KB) folded into the existing fixed `body::before` backdrop under a readability tint; original gradient retained as load-failure fallback. CSS + asset + SW shell (`v8`→`v9`) only; no CSP change |
| **7.11** | **2026-09-14** | **Chord voicings & substitutions overhaul** — pure `js/voicingLibrary.js` (chords.json → canonical interval-labeled voicings, validated/deduped, several per chord across the neck) + `js/chordSubstitutions.js` (tritone / diminished / half-dim / ii–V / m11⇄7sus4 / relative reharms). Fixes blank-grid + "1 voicing" + dropped-ii–V bugs; clickable subs panel; modal cut-off fixed. Finger numbers + ○/✕ markers + Fingers⇄Intervals toggle. SW `v9`→`v10`. No new CDN/CSP |
| **7.12** | **2026-09-14** | **Drop-2 / Drop-3 generator** — pure `js/dropVoicings.js` derives the four close-position inversions, applies drop-2/drop-3, maps to standard string sets (all 12 keys, all seventh qualities). Modal groups Library/Drop 2/Drop 3; every chart gets an always-on starting-fret badge. Plus `js/shapeGenerator.js` guarantees ≥8 shapes for triads/6ths/sus (tops up the Library group). `Cmaj7` → ~15 voicings, `C` triad → 8. SW `v10`→`v12`. No new CDN/CSP |
| Phase 1 | 2026-09-23 | Workflow/view visibility and deep-link synchronization repair; shell cache `v13`. Phase 2 coordinator scoped but not implemented. |
| Scale access | 2026-09-23 | Scale Library available in Stand mode and one tap from Improvise; reusable fretboard SVG; Learn notation transport routing; shell cache `v14` |

---

## Chord Voicing Subsystem — Key Implementation Notes (v7.11)

- **Data source of truth:** `data/chords.json` (vendored tombatossals DB) is the
  primary voicing source — several real voicings per chord. `js/jazzChordDatabase.js`
  now only contributes curated shell/drop-2 grips *on top*, it no longer shadows the
  library.
- **Fret geometry:** a `chords.json` position's `frets` value `N` is *relative* to
  `baseFret` → `absFret = (N===0) ? 0 : baseFret + N - 1`. Standard-tuning open MIDI is
  `[40,45,50,55,59,64]` (low E→high E). Interval label = `(pitch%12 - rootPc + 12) % 12`
  indexed into `INTERVAL_LABELS`. `tests/voicingLibrary.test.js` proves this by
  reconstructing the DB's own `midi` array.
- **Validation, not trust:** the DB has occasional mis-filed positions. Every voicing
  is checked against `ALLOWED_INTERVALS[quality]`; anything with an out-of-chord note
  is dropped. Add a quality to that map when introducing a new suffix.
- **ii–V vs slash bass:** `splitCompoundSymbol` treats `X/Y` as two chords only when
  `Y` carries its own quality (`Bbm7/Eb7`); a bare note (`C/G`) is a bass → voice `X`.
- **Canonical voicing shape** consumed by the renderer:
  `{ name, baseFret, fingers:[[stringNum(6=lowE..1=hiE), absFret, label?]], barres:[], source }`.
  `renderJazzVoicing` converts absFret→relative (`absFret - baseFret + 1`).

---

*Last updated: 2026-09-23 (Scale Library access and structural audit)*
