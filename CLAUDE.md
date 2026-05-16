# CLAUDE.md — Parker Songbook Tool: Redesign & Enhancement Log

## Project Overview

**Application:** Charlie Parker Songbook Trainer  
**Version:** 7.0 → 7.1 (Enhanced Edition)  
**Tech Stack:** Vanilla JavaScript SPA, pure CSS, no build system  
**Entry Point:** `index.html` (single file, ~3,400 lines)  
**Branch:** `claude/redesign-songbook-tool-0vLDm`

---

## Codebase Analysis Summary

### Architecture
- Single HTML file SPA with inline CSS, HTML, and JavaScript
- 8 external JavaScript modules in `/js/`
- Advanced Resonance Engine in `/src/features/resonance-engine/`
- Pure CSS design system with CSS custom properties
- No framework (no React/Vue/Svelte), no build tool, no package manager
- CDN dependencies: SVGuitar 1.7.1, JSZip 3.10.1
- Web Audio API for synthesis (oscillators, gain nodes)
- 46 total songs (18 core Parker + 28 Omnibook additions)

### Features Preserved (All Intact)
- Song selection dropdown (46 tunes) with random selection
- Key transposition (all 12 keys)
- Lead sheet generation (fake-book style with Roman numerals)
- Chord voicing modal (SVGuitar diagrams, multiple voicings)
- Interactive fretboard visualizer (3 modes: Chord Tones, Full Scale, Functional Harmony)
- Playback engine with BPM control, loop modes, count-in, metronome, tempo trainer
- Bebop backing track (ride cymbal, hi-hat, walking bass, shell comping)
- Scale library (27 scales across 4 categories)
- Chord-scale analysis panel (compatible scales, tensions, resolutions)
- Pattern detection (ii-V-I, turnarounds, tritone substitutions)
- Resonance Engine (gravity-based AI lick generator with fretboard overlay)
- Section Lick Generator with multi-format export (ASCII TAB, AlphaTex, MusicXML, MIDI, ZIP)
- Print functionality (opens popup with professional fake-book layout)
- Filter panel (by form, difficulty, style)

---

## Bugs Found & Fixed

### 1. Missing CSS Variables (`--border`, `--card`)
**Location:** `index.html` lines 680, 687 (inline styles on `#sectionSelect` and `#sectionTabDisplay`)  
**Issue:** The Section Lick Generator panel used `var(--border)` and `var(--card)` CSS custom properties that were never defined in `:root`. This caused these elements to render with no border color and a transparent background.  
**Fix:** Added `--border: var(--barline)` and `--card: var(--panel)` as aliases in the `:root` block, along with new design tokens `--radius`, `--transition`, `--shadow-md`, `--focus-ring`.

### 2. JSZip CDN Failure — No Error Handling
**Location:** `<script src="jszip...">` tag  
**Issue:** If the JSZip CDN failed to load, the script tag had no `onerror` handler, so the failure was silent.  
**Fix:** Added `onerror="console.warn('JSZip CDN failed to load — ZIP export unavailable')"` to the script tag. Additionally, the `exportSectionZip` function is now wrapped to show a toast notification instead of a bare `alert()` when JSZip is unavailable.

### 3. Missing ARIA Live Regions
**Location:** Multiple status elements throughout the page  
**Issue:** Dynamic status updates (playback status, audio status, resonance status, analysis panel) were not announced to screen readers.  
**Fix:** Added `aria-live="polite"` and `role="status"` to:
- `#playStatus` — playback progress messages
- `#audioStatus` — audio enable/ready messages  
- `#resonanceStatus` — resonance engine status
- `#analysisChord` — chord-scale analysis text
- `#statsBar` — songbook statistics

### 4. Misleading H2 Text
**Location:** `index.html` line 313  
**Issue:** H2 said "18 Bebop Classics — PRO Edition" but the app contains 46 tunes.  
**Fix:** Updated to "Complete Bebop Songbook" (accurate description).

### 5. Missing Semantic HTML Landmarks
**Location:** Body structure  
**Issue:** The main content area was an unstyled `<div class="card">` with no landmark role. No skip navigation link existed. Screen reader users had to tab through all navigation to reach content.  
**Fix:** Changed `<div class="card">` to `<main class="card" role="main">`. Added `<a class="skip-link" href="#sheet">` for keyboard/screen reader access.

---

## Design & Accessibility Improvements

### Accessibility (WCAG Compliance)

| Improvement | WCAG Criteria | Implementation |
|-------------|--------------|----------------|
| Skip navigation link | 2.4.1 Bypass Blocks | `.skip-link` element, focus-reveal via CSS |
| ARIA live regions | 4.1.3 Status Messages | `aria-live="polite"` on all dynamic status elements |
| Semantic landmarks | 1.3.1 Info & Relationships | `<main role="main">`, `role="search"`, `role="status"` |
| Focus ring visibility | 2.4.7 Focus Visible | `*:focus-visible` global ring + component-level `box-shadow` |
| Keyboard shortcuts | 2.1.1 Keyboard | Space=Play/Stop, R=Random, G=Generate, Esc=Stop |
| Search role | 1.3.1 Info & Relationships | `role="search"` on quick search container |
| ARIA labels | 1.3.1 Info & Relationships | Added `aria-label` to stats bar, main landmark, search |

### New Features Added

#### 1. Quick Tune Search (Always-Visible)
- Text input above the filter panel, always accessible
- Searches tune name, style, form, and key in real-time
- Shows live count: "12 / 46"
- Clears automatically when a tune is selected from the dropdown
- Clears when advanced filters are applied/cleared
- Integrated with existing `populateTuneDropdown()` — no duplicate code

#### 2. localStorage Preference Persistence
- Saves: last-selected tune, key, BPM, show-scales state, audio mode
- Restores on page reload (survives refresh)
- Uses key `cp_songbook_v7_prefs` to avoid conflicts
- Fails silently if storage is blocked (private browsing)
- Triggers restore after initial render to avoid blank state

#### 3. Keyboard Shortcuts
- `Space` — Play / Stop playback
- `Esc` — Stop all (playback + resonance lick)
- `R` — Random tune
- `G` — Generate lead sheet
- Disabled when focus is inside form fields (inputs, selects, textareas)
- Hints displayed in the playback bar and info box

#### 4. Toast Notification System
- Non-blocking, auto-dismissing notifications
- Types: `info`, `success`, `error`, `warn` with color coding
- Click to dismiss early
- Used for: random tune confirmation, tab copy success, ZIP export status, JSZip error
- Positioned bottom-right, stacks up to 5 notifications
- Animated slide-in/fade-out transitions

#### 5. Visual Improvements (CSS)
- Dark-theme scrollbar styling (`::-webkit-scrollbar`)
- Smooth transition on `.bar.playing` (instead of instant color change)
- `audioReadyPop` animation on audio status when ready
- Improved `.bar:focus-visible` ring for keyboard navigation
- Better `.bar.active` visual state with inset shadow
- `--radius`, `--transition`, `--shadow-md`, `--focus-ring` design tokens
- Hover effect on progress bar (brighten on hover)
- Stat pill hover effect (border highlights)

#### 6. Mobile Responsive Refinements
- Added `@media (max-width: 480px)` breakpoint for very small screens
- Search row stacks vertically on narrow viewports
- Shortcut hints hidden on very small screens (space-constrained)
- Reduced button padding on small screens

#### 7. Improved Print CSS
- More targeted print rules that only hide non-essential UI elements
- Sheet content preserved with appropriate print colors

### App Tagline
Added descriptive tagline below the H1: "Interactive Bebop Practice Tool · AI Resonance Engine · Guitar Fretboard Visualizer" — helps new users understand the scope immediately.

---

## Testing Results

### Syntax Validation
- Inline JavaScript: ✅ Passes `new Function()` syntax check (no parse errors)
- `<main>` tags: ✅ 1 open, 1 close (balanced)
- CSS variables: ✅ All `var(--...)` references now resolved in `:root`

### Feature Regression Check
- All existing event listeners preserved (none removed)
- All existing functions preserved and intact
- New code added exclusively via `addEventListener` with `{passive: true}` where safe
- `exportSectionZip` wrapped (original preserved as `_origExportZip`)
- No modifications to the SONGS data, OMNIBOOK_ADDITIONS, or audio engine
- No modifications to the Resonance Engine integration
- No modifications to the chord voicing modal
- Search functionality uses existing `populateTuneDropdown()` without code duplication

### Known Acceptable Trade-offs
- Page renders Anthropology first, then re-renders saved tune if preferences exist — minor flash on first load after a session change
- Tab copy toast shows 100ms after click (to allow async clipboard write to start)
- Very small screens hide keyboard shortcut hints (correct space-saving behavior)

---

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | CSS variables fix, new CSS (accessibility, search, toasts, focus, animations), HTML restructure (main landmark, skip link, search input, aria-live regions), JavaScript (toast system, localStorage, search handler, keyboard shortcuts, JSZip wrapper) |

## Files Added

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This documentation file |

---

## Next Three Logical Enhancement Steps

### Step 1: Progressive Web App (PWA) + Offline Support

**Rationale:** The app is a static file with CDN dependencies. If SVGuitar or JSZip CDNs are unavailable, features break. Musicians often practice in studios or venues with unreliable internet.

**Implementation Plan:**
1. Create `service-worker.js` that caches `index.html`, all `/js/` modules, and `/data/chords.json`
2. Add `manifest.json` for installability (home screen icon, standalone display)
3. Pre-cache the SVGuitar and JSZip libraries as part of the install step
4. Add offline fallback indicator in the UI
5. Use Cache-First strategy for static assets, Network-First for future API calls

**Impact:** Full offline functionality, installable as mobile app, ~100% reliability improvement for CDN-dependent features.

### Step 2: User Practice Session Tracking & Analytics

**Rationale:** Serious musicians need to track progress. Currently, the app has no memory of what tunes were practiced, at what tempo, or for how long.

**Implementation Plan:**
1. Add `indexedDB` (via a thin wrapper) to log practice sessions with: tune, key, BPM, duration, date
2. Add a "Practice Journal" panel (collapsible) showing last 10 sessions
3. Track which tunes have been practiced least and surface them in the random tune selector (weighted toward under-practiced)
4. Add a "streak" indicator for daily practice
5. Export practice log as CSV
6. Show per-tune stats in the tune dropdown (e.g., "practiced 3 times")

**Impact:** Transforms the tool from a reference app to a structured practice companion. Addresses a core musician need: deliberate, measurable practice.

### Step 3: Audio Input — Real-Time Pitch Detection & Feedback

**Rationale:** The app currently is entirely output-oriented (it shows what to play). A major leap would be to listen to the user play and give real-time feedback.

**Implementation Plan:**
1. Add `getUserMedia` + `AudioWorklet` for real-time microphone input
2. Implement pitch detection via autocorrelation (YIN algorithm — fast, browser-compatible)
3. Highlight notes on the fretboard as the user plays them
4. In Resonance Engine mode: show whether the user is playing the generated lick correctly (note by note)
5. Add "ear training" mode: play a chord, ask user to identify it
6. Score the user's lick improvisation against the suggested scale (% of in-scale notes)
7. Privacy: audio never leaves the browser (processed locally, no server)

**Impact:** Closes the feedback loop between the app's guidance and the user's actual playing. This is the single biggest capability gap in the current app.

---

*Documentation generated on: 2026-05-16*  
*Session: claude/redesign-songbook-tool-0vLDm*
