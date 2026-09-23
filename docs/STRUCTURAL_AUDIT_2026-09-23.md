# Parker Songbook structural audit — 2026-09-23

## Scope and verification

This review traces the current `main` application from HTML/script loading through
workflow modes, lead-sheet views, scale selection, audio, storage, and PWA caching.
It supersedes the **historical snapshot** in `DEEP_CODE_REVIEW.md` where that
document describes issues already repaired. The live GitHub Pages app was used
to reproduce Scale Library behavior in a fresh browser; source inspection and
the Node test suite cover the proposed changes. A specific iPhone/Safari session
with the user's stored preferences was not available for inspection.

## How the app works now

| Layer | Current path | State and dependencies |
| --- | --- | --- |
| Page shell | `index.html` (~9,600 lines, ~0.5 MB) contains CSS, 67 tune charts, audio/render/import code, and UI wiring | Main inline script runs while the parser is at the end of the body. Eighteen first-party scripts use `defer`; they execute before `DOMContentLoaded`, after the inline script. |
| Navigation | `body[data-active-mode]` gates `data-modes` panels; `switchView()` chooses Grid/Notation/Tab; hash router serializes mode/tune/key/view | Mode and view state are separate. `.is-disarmed` hides feature/tab panels; `cp:navigation` keeps the URL in sync. |
| Music | Lead-sheet renderer and Web Audio are inline; Heads and Notation each own an AlphaTab API; fretboard uses a cached SVG grid | AlphaTab, JSZip, and SVGuitar load on demand through `loadCdnLib()`. SVGuitar has a local fallback; AlphaTab currently does not. |
| Persistence | Local storage for preferences/imports; IndexedDB for practice sessions and reference audio | Two historical practice databases write different session shapes and thresholds; `PracticeStore` reconciles them on read. Reference clips use a third database. |
| Offline | `service-worker.js` caches shell files and pinned CDN assets | A cache version bump is needed whenever the shell changes. CDN failure may still affect the feature that needs that library. |

## Confirmed Scale Library issue and repair

1. On the live site, Improvise displayed 25 scale entries; its `<details>` panel
   opened and selecting Major Bebop painted the fretboard. The data builder and
   selection handler therefore work in an ordinary desktop session.
2. Turning on Stand mode while the Scale Library remained open changed its
   computed `display` to `none`: the broad `body.stand-mode details` rule hid it.
   The mode navigation remained visible, creating a path into Improvise with no
   visible scale menu. The rule now excludes `.scale-lib`.
3. The panel was also placed below the sheet, fretboard, Resonance controls,
   and Section Lick panel. The new Improvise shortcut opens it and scrolls to it.
   Scale entries are keyboard-accessible buttons with selected state.
4. Each scale tap previously rebuilt the entire SVG fretboard and immediately
   cleared/repainted it. The selection handler now reuses the cached SVG cells.

This confirms a real visibility failure, but does not establish that Stand mode
was enabled in the user's own session. If the menu still fails there after this
repair, capture the mode, Stand-button state, and whether the shortcut scrolls
to a visible panel; a Safari-specific layout problem would then be the next
target.

## Other confirmed navigation mismatch repaired here

Phase 1 made Notation and Tab selectable in Learn. `routePlay()` still sent all
Learn playback to the chord-grid button, while AlphaTab reported its playback
state only as Practice. The result was a visible notation view paired with the
wrong global Play target and an unsynchronized transport label. The transport
now chooses its target from **mode plus sheet view**. Switching back to Grid or
changing mode stops the notation player, so hidden playback does not continue.

## Remaining bottlenecks and recommended order

### 1. Establish readiness per feature, not a page-wide CDN gate

The inline main script executes before the 18 deferred first-party scripts.
Most module use is delayed through `DOMContentLoaded` or user actions, but
readiness is implicit across several IIFEs. Add a small coordinator that records
DOM readiness, checks named first-party capabilities, and exposes bounded,
retryable promises for the database and each optional CDN library. Initialize
the navigation and scale library once the DOM/core data are available; load
AlphaTab for notation, SVGuitar for voicings, and JSZip for ZIP import/export
only when those features are requested. A single `Promise.all()` over all CDNs
and IndexedDB would turn one blocked service into a blank or stuck app.

### 2. Cancel stale notation/head requests

`_fetchAndLoad()` in the notation module and `hdFetch()` in the Heads module
start `fetch()` requests without an abort controller or generation check. If
the user selects tune B before tune A's request finishes, A can finish last
and replace B's score. The 60 ms deferred tune-change reload adds another
ordering edge. Give each player a request sequence/abort controller, and ignore
results and errors from older requests. Test rapid A→B→A selections with delayed
responses before changing the loading path.

### 3. Reduce startup parse and event fan-out

The half-megabyte HTML contains chart data and most app logic in one inline
script. Startup constructs the fretboard and all 25 scale entries even when
the user starts in Learn; tune changes fan out to rendering, saved preferences,
practice sessions, two AlphaTab modules, reference audio, and the hash router.
Measure parse/evaluation and long tasks on a real iPhone before extracting
code. A useful first seam is static tune data in a separate JSON/module and a
single tune-change dispatcher with explicit subscribers; preserve offline
caching and avoid serial network waits for core navigation.

### 4. Consolidate practice persistence after measuring failure behavior

`cp_practice_v1` and `cp_practice_db` both write sessions with different minimum
durations (10 and 30 seconds); the read model merges them. This is maintenance
and consistency cost, not evidence that IndexedDB blocks the scale menu. Choose
one canonical store, migrate existing records idempotently, and provide a
degraded in-memory mode if storage is unavailable. Reference audio can remain
separate because its blob lifecycle is different.

## Regression checks

- Enter Improvise normally and in Stand mode: the shortcut and Scale Library
  must be visible; tapping the shortcut opens and scrolls to all 25 entries.
- Select two scales in succession: only the current scale reports pressed,
  the fretboard updates, and the SVG node is reused.
- In Learn, switch Grid→Notation→Grid and use global Play/Stop; then repeat in
  Practice and switch to Journal mid-playback. Hidden notation audio must stop.
- Refresh a shared `#mode=improvise&...` URL with saved local preferences;
  the hash still wins and the scale shortcut remains available.

Automated tests exercise the scale controller and transport routing. A live
browser check after deployment remains valuable for iPhone scrolling, the
sticky transport, and service-worker cache replacement.
