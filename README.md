# Parker-songbook-tool
Jazz guitar practice app using Charlie Parker songbook and theory

## Navigation

Choose Learn, Practice, Improvise, or Journal in the workflow bar. In Learn or
Practice, use Chord Grid / Notation / Tab above the sheet. Switching modes keeps
the selected sheet view; the Resonance prompt in Improvise opens Learn's chord
grid so you can select a bar. A shared URL stores mode, tune, key, and view.

Phase 1 navigation fixes were applied on 2026-09-23. The proposed Phase 2
startup coordinator (DOM, first-party modules, CDN libraries, IndexedDB) has
not been implemented; the current CDN loader fetches libraries on demand.

In Improvise, tap **Open Scale Library** just below the workflow
tabs. Choose a Scale key, then tap a scale to hear and see it in that key. Switch
the fretboard between **Note names**, **Intervals**, and **Scale steps**; steps
repeat 1–6 for whole tone, 1–7 for seven-note scales, or 1–8 for bebop scales. The selected scale
also drives the mic's in-scale meter. The library stays available in Stand mode.
See `docs/STRUCTURAL_AUDIT_2026-09-23.md` for the current
architecture and prioritized follow-up work.
Here’s how I’d pitch it to each audience:

For Musicians 🎷
A pocket-sized bebop reference that puts 22 Charlie Parker compositions at your fingertips. Transpose any tune instantly to your working key, click any chord to hear the root and see exactly where the chord tones and scale options live on the fretboard. Great for woodshedding changes on the gig bus or in the practice room.

For Students 🎓
Think of it as an interactive theory textbook focused entirely on bebop. Every chord is labeled with its Roman numeral function, so you can see the ii-V-I patterns, tritone subs, and altered dominants as they move through Bird’s compositions — not just memorize them. The fretboard visualizer connects the harmony directly to your instrument in real time.

For Educators 👩‍🏫
A ready-made curriculum tool for teaching bebop harmony. You can use it to demonstrate how Parker reharmonized standard forms like the blues and rhythm changes, walk students through modal and scale choices over specific chord functions, and print clean lead sheets in any key for sight-reading exercises. The Roman numeral analysis does a lot of the theoretical heavy lifting for you.

The through-line for all three:
It bridges the gap between theory on the page and sound on the instrument — which is exactly where most jazz learning breaks down.

## Guitar chord voicing viewer

This app now includes a dynamic chord voicing modal for lead-sheet chords.

- Chord dictionary file: `data/chords.json` (fetched once and cached in memory).
- Lookup path: lead-sheet chord symbol → parser normalization → dictionary lookup by root/suffix → voicing list.
- Parser handles aliases such as:
  - `min7`, `m7`, `-7` → `m7`
  - `maj7`, `Δ7`, `Δ`, `^7`, `^` → `maj7`
  - `m`, `min`, `-` → `m`
  - `dim`, `°` → `dim`
  - `dim7`, `°7` → `dim7`
  - `aug`, `+` → `aug`
  - `m7b5`, `ø`, `ø7` → `m7b5`
- Slash-chord behavior: slash bass is preserved for display (e.g. `C7/E`) while lookup is done against the main chord (`C7`).
- Enharmonic limitation: voicing availability depends on dictionary spellings (e.g. some uncommon spellings may map imperfectly).
- Diagram rendering uses a bundled local SVGuitar UMD build at `./js/svguitar.umd.js` for GitHub Pages/mobile reliability (no CDN dependency at runtime).
