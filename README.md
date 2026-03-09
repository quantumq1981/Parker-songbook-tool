# Parker-songbook-tool
Jazz guitar practice app using Charlie Parker songbook and theory
Here’s how I’d pitch it to each audience:

For Musicians 🎷
A pocket-sized bebop reference that puts 18 Charlie Parker compositions at your fingertips. Transpose any tune instantly to your working key, click any chord to hear the root and see exactly where the chord tones and scale options live on the fretboard. Great for woodshedding changes on the gig bus or in the practice room.

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
- Diagram rendering uses SVGuitar loaded from CDN (`https://cdn.jsdelivr.net/npm/svguitar@2.0.3/dist/svguitar.umd.js`).
