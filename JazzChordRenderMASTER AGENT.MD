MASTER AGENT.MD: Jazz Chord Rendering & Mobile UI Protocol

Version 7.1
For the Parker Songbook Tool App

---

Purpose

This document defines the authoritative standards, rules, and implementation roadmap for rendering jazz chord diagrams in the Parker Songbook mobile web app. It consolidates all technical requirements—from library loading and data formatting to mobile UI constraints and database expansion—into a single source of truth. Every agent working on this project must follow these guidelines to ensure consistent, production‑ready results on all devices, especially iPhones.

---

Core Principles: Three Best‑Practice Fail‑Safes

Always defer to these three high‑level principles in all work:

1. The “Case‑Sensitivity” Audit
   GitHub Pages is case‑sensitive; local servers are not.
   Directive: Perform a 1:1 filename audit. Ensure every import and script src path matches the exact capitalization in the GitHub repository file tree.
2. The “Pre‑Flight” Console Log
   Never let the app fail silently.
   Directive: Add a global error catch. If window.svguitar is undefined, display a detailed error (including window.location.href) on screen instead of an empty box.
3. CSS “Z‑Index” and “Touch” Priority
   On iPhones, the modal must capture touch events and scroll smoothly.
   Directive: Force the modal layer with z-index: 9999; and lock the background body with touch-action: none; when the modal is open.

---

1. Critical Dependencies & Library Loading

The “Unable to load diagram library” error is a load‑sequence or path failure.

· Use a CDN in the <head> of index.html:
  ```html
  <script src="https://unpkg.com/svguitar@1.7.1/dist/svguitar.umd.js"></script>
  ```
· Load Order: The SVGuitar library must load before jazzChordDatabase.js and chordDiagram.js.
· Validation: Confirm window.svguitar exists before any rendering code runs.
· Cache Busting: Append a version string to custom JS files to force updates:
  ```html
  <script src="js/chordDiagram.js?v=7.1"></script>
  ```

---

2. Data Structure & Fingerings (The “Tuple” Rule)

SVGuitar only renders dots when data is in the exact [[string, fret]] tuple format.

· Format: fingers: [[6, 1], [4, 2], [3, 2], [2, 1]] (example: Fmaj7 shell).
· String Numbering: 6 = low E (bass), 1 = high E (treble).
· Muted Strings: Omit them entirely from the array.
· Interval Labels (Optional): The database may include a third element [string, fret, "R"] for labeling. The renderer can use these for dot labels (see Section 9).

---

3. Rendering Timing – The “Wait for Paint” Rule (Mobile Fix)

iPhones often report 0px container height while a modal is animating, causing invisible SVGs.

· Action: Wrap every .draw() command in a setTimeout of at least 100ms to allow the modal to fully appear.
  ```javascript
  setTimeout(() => { chart.draw(); }, 100);
  ```
· Event‑Based Alternative: If using a modal, trigger drawing on the transitionend event.
· Container Sizing: Force explicit dimensions in CSS:
  ```css
  .chord-svg-container {
    height: 200px !important;
    width: 100%;
  }
  ```

---

4. UI & Viewport Constraints (The “Cut‑Off” Fix)

The chord modal must stay inside the viewport and scroll internally on mobile.

· CSS Requirements:
  ```css
  .modal-container {
    max-height: 85vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch; /* smooth iPhone scrolling */
    z-index: 9999;
  }
  body.modal-open {
    position: fixed;
    width: 100%;
    touch-action: none; /* prevent background scrolling */
  }
  ```

---

5. Jazz Database Expansion

Replace the existing jazzChordDatabase.js with the “Bebop Essentials” data set below. This provides shell and drop‑2 voicings with interval labels and baseFret for high‑position diagrams.

```javascript
{
  "voicings": {
    "BbΔ7": [
      { "name": "BbΔ7 (Shell)", "fingers": [[6, 6, "R"], [4, 7, "7"], [3, 7, "3"]], "baseFret": 6 },
      { "name": "BbΔ7 (Root 5)", "fingers": [[5, 1, "R"], [4, 3, "5"], [3, 2, "7"], [2, 3, "3"]], "baseFret": 1 }
    ],
    "G7": [
      { "name": "G7 (Shell)", "fingers": [[6, 3, "R"], [4, 3, "b7"], [3, 4, "3"]], "baseFret": 1 },
      { "name": "G7 (Root 5)", "fingers": [[5, 10, "R"], [4, 12, "5"], [3, 10, "b7"], [2, 12, "3"]], "baseFret": 10 }
    ],
    "Cm7": [
      { "name": "Cm7 (Root 6)", "fingers": [[6, 8, "R"], [4, 8, "b7"], [3, 8, "b3"]], "baseFret": 8 },
      { "name": "Cm7 (Root 5)", "fingers": [[5, 3, "R"], [4, 5, "5"], [3, 3, "b7"], [2, 4, "b3"]], "baseFret": 3 }
    ],
    "F7": [
      { "name": "F7 (Shell)", "fingers": [[6, 1, "R"], [4, 1, "b7"], [3, 2, "3"]], "baseFret": 1 },
      { "name": "F7 (Root 5)", "fingers": [[5, 8, "R"], [4, 10, "5"], [3, 8, "b7"], [2, 10, "3"]], "baseFret": 8 }
    ],
    "Ab7": [
      { "name": "Ab7 (Shell)", "fingers": [[6, 4, "R"], [4, 4, "b7"], [3, 5, "3"]], "baseFret": 4 },
      { "name": "Ab7 (Root 5)", "fingers": [[5, 11, "R"], [4, 13, "5"], [3, 11, "b7"], [2, 13, "3"]], "baseFret": 11 }
    ],
    "Dm7": [
      { "name": "Dm7 (Root 5)", "fingers": [[5, 5, "R"], [4, 7, "5"], [3, 5, "b7"], [2, 6, "b3"]], "baseFret": 5 }
    ],
    "D7": [
      { "name": "D7 (Shell)", "fingers": [[5, 5, "R"], [4, 4, "3"], [3, 5, "b7"]], "baseFret": 5 }
    ],
    "EbΔ7": [
      { "name": "EbΔ7 (Root 5)", "fingers": [[5, 6, "R"], [4, 8, "5"], [3, 7, "7"], [2, 8, "3"]], "baseFret": 6 }
    ],
    "Am7": [
      { "name": "Am7 (Shell)", "fingers": [[6, 5, "R"], [4, 5, "b7"], [3, 5, "b3"]], "baseFret": 5 }
    ]
  }
}
```

Notes:

· fingers array: [stringNumber, fretNumber, intervalLabel]
· baseFret indicates the starting fret of the diagram (e.g., 6 means frets 6–9). The renderer must display this number (e.g., “6fr”).

---

6. Symbol Normalization (Alias Mapping)

Chord symbols in song charts vary (e.g., CΔ7, Cmaj7, CM7). Normalize them to a canonical key used in the database.

· Alias Map:
  ```javascript
  const chordTypeAliases = {
    'maj7': 'Δ7',
    'M7': 'Δ7',
    'Δ7': 'Δ7',
    '∆7': 'Δ7',
    'm7b5': 'm7b5',
    'ø7': 'm7b5',
    'Ø7': 'm7b5',
    'dim7': 'dim7',
    '°7': 'dim7',
    'º7': 'dim7'
    // add others as needed
  };
  ```
· Normalization Function:
  ```javascript
  function normalizeChordSymbol(symbol) {
    const match = symbol.match(/^([A-G][b#]?)(.*)$/);
    if (!match) return symbol;
    const [, root, type] = match;
    const normalizedType = chordTypeAliases[type] || type;
    return root + normalizedType;
  }
  ```
· Integrate this function into the chord lookup process so every chart symbol is normalized before querying the database.

---

7. Transposition Logic (Generate All Keys from Core Shapes)

Avoid hardcoding every key. Implement a transposer that shifts fret positions of a voicing to a new root.

Steps:

1. Extract source root from the voicing’s key (e.g., "BbΔ7" → root "Bb", type "Δ7").
2. Calculate semitone difference between target root and source root using a note index:
   ```javascript
   const noteIndex = { 'C':0, 'C#':1, 'Db':1, 'D':2, 'D#':3, 'Eb':3, 'E':4, 'F':5, 'F#':6, 'Gb':6, 'G':7, 'G#':8, 'Ab':8, 'A':9, 'A#':10, 'Bb':10, 'B':11 };
   ```
   diff = (targetIdx - sourceIdx + 12) % 12.
3. Shift each finger: if fret > 0, newFret = fret + diff; open strings (fret = 0) remain 0.
4. Recalculate baseFret: set it to the new lowest fret (excluding 0) to preserve the shape’s visual position. For example, if the original shape’s lowest fret was 3 and baseFret was 3, after transposition the lowest fret becomes 3+diff; set baseFret to that value.
5. Validate fret range (≤ 24). If any finger exceeds the fretboard, skip that voicing or choose another inversion.

Note: Store the source root explicitly for each voicing (parse from the object key).

---

8. Fallback Mechanism

If after normalization and transposition no jazz voicing is found, never show a blank grid. Fall back to a basic chord from chords.json (or a minimal built‑in database). This ensures the user always sees something.

---

9. Visual Polish & SVG Alignment

Make the diagrams look like a “Pro Edition” trainer.

· SVGuitar Options:
  ```javascript
  const options = {
    padding: 5,                // reduces white space
    fixedFretCount: 4,         // uniform size
    fingerColor: '#f1c40f',    // gold
    fretColor: '#444',
    stringColor: '#888',
    labelColor: '#fff'
  };
  ```
· Interval Labels: Use the third element from the fingers array to label dots (e.g., “R”, “3”, “7”) instead of finger numbers.
· Fret Number Display: When baseFret > 1, show the starting fret (e.g., “6fr”) next to the diagram.

---

10. Production Safeguards

Case‑Sensitivity Audit

· Verify every file reference in HTML, JS, and CSS matches the exact case in the GitHub repository.
· Pay special attention to js/ folder contents: jazzChordDatabase.js vs JazzChordDatabase.js.

Cache Busting

· Append a version query string to custom JS files after every deployment:
  ```html
  <script src="js/chordDiagram.js?v=7.1"></script>
  ```
· This forces iPhones to download the latest code immediately.

Global Error Handling

· If window.svguitar is undefined, display a user‑friendly error with troubleshooting info (e.g., “Library failed to load. Check network or contact support.”) and log the current URL.

“Hard‑Refresh” Note for Testers

· After pushing fixes, remind testers to perform a hard refresh (or use version strings) to bypass Safari’s aggressive caching.

---

11. Testing & Validation Checklist

Use this checklist to verify all components:

· CTest (Hardcoded C chord): Can you render a basic C chord on an iPhone with gold dots and a “3fr” label? If yes, the rendering pipeline works.
· Library Load: Confirm window.svguitar exists before custom code runs.
· Symbol Normalization: Test CΔ7, Cmaj7, CM7 → all resolve to the same voicing.
· Transposition: Request GbΔ7 (not in DB) → should transpose from FΔ7 or CΔ7 and display correctly.
· High‑Position Chords: BbΔ7 (baseFret 6) shows “6fr” and correct frets.
· Mobile Modal: Open modal on iPhone; verify scrollability and that background is locked.
· Fallback: Remove a jazz voicing intentionally; ensure a basic chord appears.
· Case Sensitivity: Run a production build on GitHub Pages and verify all assets load.
· Error Handling: Simulate library failure (block CDN) → on‑screen error appears.

---

12. Final Implementation Checklist for Agents

· Move SVGuitar script to <head> using CDN.
· Replace jazzChordDatabase.js with the provided JSON.
· Implement normalizeChordSymbol() and integrate into lookup.
· Build transposition function and integrate.
· Add fallback to chords.json.
· Update SVGuitar options with padding, fixedFretCount, and gold colors.
· Add setTimeout wrapper around all .draw() calls (100ms).
· Apply modal CSS with max-height, overflow, -webkit-overflow-scrolling, and z-index.
· Add body locking class when modal opens.
· Perform case‑sensitivity audit on all file paths.
· Append version strings to JS includes.
· Add global error catch for missing library.
· Test on iPhone (real device or simulator) and verify diagrams render, scroll, and look polished.

---

Final Thought for the New Developer

The “CTest” (hardcoded C chord) is the ultimate diagnostic. If you can get a hardcoded C chord to show up on an iPhone with gold dots and a “3fr” label, the rest of the app is just a simple data‑mapping task.
