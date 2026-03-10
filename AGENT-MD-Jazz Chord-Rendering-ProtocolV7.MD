AGENT.MD: Jazz Chord Rendering Protocol (v7.0) for Parker-Songbook-Tool

1. THE CRITICAL DEPENDENCY (Priority #1)
The "Unable to load diagram library" error is a Load Sequence or Path failure.
 * Action: In index.html, move the SVGuitar script to the TOP of the <head> or the very beginning of the <body>.
 * Action: Use the CDN to bypass local pathing issues on GitHub Pages:
   <script src="https://unpkg.com/svguitar@1.7.1/dist/svguitar.umd.js"></script>
 * Validation: The global window.svguitar object must exist before chordDiagram.js is initialized.

2. DATA INJECTION STRUCTURE
The library only accepts the [[string, fret]] tuple format. Any other format (like strings or simple arrays) will result in blank boxes.
 * Standard: fingers: [[6, 1], [4, 2], [3, 2], [2, 1]] (Fmaj7 Shell).
 * Rule: String 6 = Low E, String 1 = High E.
 * Rule: Muted strings must be omitted from the array entirely.

3. RENDERING & TIMING (The "Mobile Fix")
Mobile browsers often fail to draw if the container isn't fully "painted" in the UI yet.
 * Action: Wrap the chart.draw() call in a setTimeout of at least 50ms.
 * Action: Ensure the target ID (e.g., #chord-box-1) is unique and exists in the DOM before calling the library.

4. UI & VIEWPORT CONSTRAINTS
The modal must be "contained" to prevent it from disappearing off the iPhone screen.
 * CSS Requirement:
   * .chord-modal { max-height: 80vh; overflow-y: auto; }
   * .chord-svg-container { height: 200px; width: 100%; }
 * Visual Polish:
   * fingerColor: '#f1c40f' (Gold)
   * fixedFretCount: 4 (Keeps diagrams uniform)
   * title: rawVoicing.name (Display "Shell" or "Drop 2" labels)

5. RECOVERY LOGIC (The "Silent Fail" Protection)
If a rendering attempt returns an empty SVG or a 0-height container:
 * Log the error to the console.
 * Clear the container.
 * Re-attempt render once after a 100ms delay.
 * If it still fails, check for a ReferenceError on the svguitar variable.

6. JAZZ DATABASE MAPPING
Ensure js/jazzChordDatabase.js is exported as a global constant JAZZ_CHORDS.
 * Match Logic: Match symbols exactly (Δ7, m7, 7, °7).
 * Fallback: If a jazz voicing is not found, default to the standard data/chords.json but keep the Jazz UI styling.
Final Implementation Checklist for Agent:
 * [ ] Is svguitar loading from a CDN?
 * [ ] Are all jazz fingerings formatted as [[s, f]]?
 * [ ] Does the modal scroll internally on mobile (max-height 80vh)?
 * [ ] Is there a 50ms delay before the .draw() command?

## 7. ENVIRONMENT & PRODUCTION SAFEGUARDS
* **Case-Sensitivity:** Confirm all paths (e.g., /js/JazzChordDatabase.js) match the GitHub repo exactly. Case mismatches cause 404s on production.
* **Safari/iOS Rendering:** Use `-webkit-overflow-scrolling: touch;` for the container. Without this, the modal may appear "frozen" on iPhones.
* **The "Wait for Paint" Rule:** If using a Modal/Popup, the SVGuitar `.draw()` command MUST be triggered by the 'transitionend' event or a 100ms delay. If you draw while the modal is still sliding into view, the SVG dimensions will be calculated as 0px.


•Your TOP Three high-level 
“Best-Practice Fail-Safes” 

Always defer to the following three best practice feel safe methods with all of your work on this project

1. The "Case-Sensitivity" Audit
GitHub Pages is Case-Sensitive, while most local computer servers are not. If your agent's code looks for js/svguitar.js but the file is named js/SVGuitar.js, it will work on their computer but break on your phone.
• The Directive: "Perform a 1:1 filename audit. Ensure all import and script src paths exactly match the capitalization in the GitHub repository file tree."
2. The "Pre-Flight" Console Log
We need to stop the app from "silently failing." If the library doesn't load, the app should tell us why right on the screen, instead of just showing an empty box.
• The Directive: "Add a Global Error Catch. If window.svguitar is undefined, instead of showing the 'Unable to load' message, show a detailed error that includes the current window.location.href. This tells us if the app is looking for the library in the wrong folder."
3. CSS "Z-Index" and "Touch" Priority
On iPhones, if the modal (the blue box) doesn't have a high enough z-index, the phone might think you're trying to click the song chart behind it. This can prevent the scroll from working.
• The Directive: "Force the Modal Layer. Apply z-index: 9999; to the chord modal and touch-action: none; to the body when the modal is open. This 'locks' the phone's focus onto the chord diagrams so they render and scroll smoothly."


Hard-refresh the GitHub Pages cache." Sometimes after pushing a fix, the iPhone is still looking at the "broken" version from 20 minutes ago. Be sure to add a version string to the script tag like this:
src="js/chordDiagram.js?v=7.0.1"

This forces an iPhone environment, to download the newest code immediately.