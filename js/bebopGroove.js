/* ============================================================
   bebopGroove.js — Pure, headless bebop rhythm-section engine.

   Produces a strongly-typed per-bar EVENT PLAN from a chord symbol,
   the *next* bar's root, tempo, feel style and a bar index. The plan
   is rendered to Web Audio by a dumb synth in index.html — this file
   contains NO audio code, so it is 100% testable in Node.

   The "feel" concept is the native, CSP-safe analogue of the werckmeister
   "style": a data table that decides swing ratio, ride pattern, comp
   density and kick feel. No binary, no CDN, no build step.

   ── Event schema (all positions in BEATS from bar start) ──
     {
       voice : 'bass'|'comp'|'ride'|'hihat'|'kick',
       beat  : 0..3,            // which quarter-note beat
       eighth: 0|1,             // 0 = downbeat, 1 = swung upbeat of that beat
       midi  : number|null,     // pitched voices only (bass, comp); null for drums
       dur   : number,          // duration in beats
       vel   : number,          // 0..1 relative velocity
       micro : number           // micro-timing shift in beats (+ = behind the beat)
     }

   The renderer computes onset seconds as:
     beatDur = 60 / bpm
     pos     = beat + (eighth ? swing : 0) + micro         // in beats
     t       = t0 + pos * beatDur
     durSec  = dur * beatDur
============================================================ */
(function (root) {
  'use strict';

  /* ── Note-name → pitch class (mirrors index.html NOTE_IDX aliases) ── */
  var PC = {
    'C': 0, 'B#': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4, 'F': 5, 'E#': 5, 'F#': 6, 'Gb': 6, 'G': 7,
    'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
  };

  /* ── Chord quality → interval sets (semitones from root) ── */
  var CHORD_TONES = {
    maj7:  [0, 4, 7, 11],
    m7:    [0, 3, 7, 10],
    dom7:  [0, 4, 7, 10],
    m7b5:  [0, 3, 6, 10],
    dim:   [0, 3, 6, 9]
  };
  // Guide tones = [3rd, 7th]; color = 9th. These are what a pianist voices
  // rootless. dim uses the diminished 7th (9 semis) as its "7th".
  var GUIDE_TONES = {
    maj7:  [4, 11],
    m7:    [3, 10],
    dom7:  [4, 10],
    m7b5:  [3, 10],
    dim:   [3, 9]
  };

  /* ── Feel registry (the "style" table) ──
     swingSlow / swingFast : downbeat-eighth fraction of the beat at the
       slow (≤90 BPM) and fast (≥260 BPM) anchors. 0.5 = straight, 0.667 =
       hard triplet. Bebop straightens as tempo climbs.
     compDensity : 0..1 probability weight toward busier comp patterns.
     ride        : 'spang' (spang-a-lang) | 'sparse' (downbeats only).
     kick        : 'feather' (all 4 soft) | 'sparse' (1 & 3 only).       */
  var FEELS = {
    medium:  { label: 'Medium Swing', swingSlow: 0.66, swingFast: 0.58, compDensity: 0.75, ride: 'spang',  kick: 'feather' },
    uptempo: { label: 'Up-tempo',     swingSlow: 0.60, swingFast: 0.54, compDensity: 0.45, ride: 'spang',  kick: 'sparse'  },
    ballad:  { label: 'Ballad',       swingSlow: 0.68, swingFast: 0.62, compDensity: 0.85, ride: 'sparse', kick: 'feather' }
  };

  var BASS_LO = 28, BASS_HI = 52;   // E1 .. E3 — walking-bass register
  var COMP_LO = 55, COMP_HI = 74;   // G3 .. D5 — rootless comp register

  /* ── Deterministic PRNG (mulberry32) for reproducible humanization ── */
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function noteToPc(name) {
    if (typeof name !== 'string') return 0;
    var m = name.match(/^([A-Ga-g][b#]?)/);
    if (!m) return 0;
    var k = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return PC[k] === undefined ? 0 : PC[k];
  }

  // Classify a chord symbol into one of the five qualities. Order matters:
  // maj7 first (Δ / maj7), then half-dim, then fully-dim, then plain minor.
  function qualityOf(chordSym) {
    var s = String(chordSym || '');
    // Strip the root (A–G + optional accidental) so the suffix is unambiguous —
    // the root letter would otherwise collide with the "m" of a minor chord.
    var m = s.match(/^[A-Ga-g][b#]?/);
    var suf = m ? s.slice(m[0].length) : s;
    if (/Δ|maj7|ma7|M7/.test(suf)) return 'maj7';
    if (/m7b5|ø|min7b5|-7b5/i.test(suf)) return 'm7b5';
    if (/dim|°|o7/i.test(suf)) return 'dim';
    if (/^m(?!aj)|^min|^-/i.test(suf)) return 'm7';
    return 'dom7';
  }

  /* ── Register helpers ── */
  function nearestMidi(pc, ref) {
    pc = ((pc % 12) + 12) % 12;
    var oct = Math.round((ref - pc) / 12);
    return pc + 12 * oct;
  }
  function clampToRange(midi, lo, hi) {
    while (midi < lo) midi += 12;
    while (midi > hi) midi -= 12;
    // If the range is narrower than an octave the loops can overshoot; pin it.
    if (midi < lo) midi = lo;
    if (midi > hi) midi = hi;
    return midi;
  }

  /* ── Tempo-adaptive swing ratio ── */
  function swingRatio(bpm, feel) {
    var f = FEELS[feel] || FEELS.medium;
    var lo = 90, hi = 260;
    var t = (bpm - lo) / (hi - lo);
    if (t < 0) t = 0; else if (t > 1) t = 1;
    return f.swingSlow + (f.swingFast - f.swingSlow) * t;
  }

  /* ── Walking bass: 4 quarter notes, beat 4 = chromatic approach to next root ──
     Returns [{ midi, beat }, …] length 4, with a smooth (stepwise-ish) contour
     anchored near the previous bar's last bass note.                           */
  function walkingBass(rootPc, qual, nextRootPc, prevMidi, rng) {
    var tones = CHORD_TONES[qual] || CHORD_TONES.dom7;
    var anchor = (prevMidi == null) ? 40 : prevMidi;

    // Beat 1 — the root, in the octave nearest the incoming line.
    var m1 = clampToRange(nearestMidi(rootPc, anchor), BASS_LO, BASS_HI);

    // Beat 4 — chromatic approach to the next root, from below (classic) or above.
    // Prefer from below ~60% of the time; the leading tone is the strongest pull.
    var approachPc = (rng() < 0.6) ? ((nextRootPc + 11) % 12) : ((nextRootPc + 1) % 12);

    // Beat 2 — the fifth (the other pillar of a walking line).
    var m2 = clampToRange(nearestMidi((rootPc + 7) % 12, m1), BASS_LO, BASS_HI);

    // Provisional beat-4 target, placed near beat 2 so the whole bar stays tight.
    var m4 = clampToRange(nearestMidi(approachPc, m2), BASS_LO, BASS_HI);

    // Beat 3 — the chord tone whose octave placement best bridges beat 2 → beat 4.
    var mid = (m2 + m4) / 2;
    var best = null, bestD = Infinity;
    tones.forEach(function (iv) {
      var cand = clampToRange(nearestMidi((rootPc + iv) % 12, mid), BASS_LO, BASS_HI);
      var d = Math.abs(cand - mid);
      if (d < bestD) { bestD = d; best = cand; }
    });
    var m3 = (best == null) ? m2 : best;

    // Re-place beat 4 near beat 3 so the approach genuinely steps into the target.
    m4 = clampToRange(nearestMidi(approachPc, m3), BASS_LO, BASS_HI);

    return [
      { midi: m1, beat: 0 },
      { midi: m2, beat: 1 },
      { midi: m3, beat: 2 },
      { midi: m4, beat: 3 }
    ];
  }

  /* ── Guide-tone comp voicing: [3rd, 7th, 9th], voice-led near the previous top ── */
  function guideVoicing(rootPc, qual, prevTop) {
    var g = GUIDE_TONES[qual] || GUIDE_TONES.dom7;
    var pcs = [(rootPc + g[0]) % 12, (rootPc + g[1]) % 12, (rootPc + 2) % 12 /* 9th */];
    var center = (prevTop == null) ? 63 : prevTop;
    return pcs.map(function (pc) { return clampToRange(nearestMidi(pc, center), COMP_LO, COMP_HI); });
  }

  /* ── Comp rhythm patterns (hit positions). dur/vel are per-hit defaults. ── */
  var COMP_PATTERNS = {
    sparse:     [{ beat: 1, eighth: 1 }],                                   // just the "and of 2"
    and2and4:   [{ beat: 1, eighth: 1 }, { beat: 3, eighth: 1 }],           // classic upbeats of 2 & 4
    charleston: [{ beat: 0, eighth: 0 }, { beat: 1, eighth: 1 }],           // "1 … and-of-2"
    push:       [{ beat: 1, eighth: 1 }, { beat: 2, eighth: 0 }],           // syncopated push into 3
    anticipate: [{ beat: 1, eighth: 1 }, { beat: 3, eighth: 1 }, { beat: 3, eighth: 0 }]
  };

  // Weighted pattern pool: denser feels bias toward busier patterns.
  function pickCompPattern(feel, rng) {
    var d = (FEELS[feel] || FEELS.medium).compDensity;
    // Weight sparse high when density is low; busy patterns scale with density.
    var pool = [
      { key: 'sparse',     w: 1.2 * (1 - d) + 0.2 },
      { key: 'and2and4',   w: 0.8 + d * 0.6 },
      { key: 'charleston', w: 0.4 + d * 0.9 },
      { key: 'push',       w: 0.3 + d * 0.8 },
      { key: 'anticipate', w: 0.1 + d * 0.7 }
    ];
    var total = pool.reduce(function (a, p) { return a + p.w; }, 0);
    var r = rng() * total;
    for (var i = 0; i < pool.length; i++) {
      r -= pool[i].w;
      if (r <= 0) return pool[i].key;
    }
    return 'and2and4';
  }

  /* ── Ride & hats & kick per feel ── */
  function rideEvents(feel, rng) {
    var f = FEELS[feel] || FEELS.medium;
    var evs = [];
    // Downbeats 1–4 always present; beat 1 accented.
    for (var b = 0; b < 4; b++) {
      evs.push({ voice: 'ride', beat: b, eighth: 0, midi: null, dur: 0.5,
                 vel: (b === 0 ? 1.0 : 0.85) * (0.92 + rng() * 0.16), micro: (rng() - 0.5) * 0.01 });
    }
    if (f.ride === 'spang') {
      // Swung upbeats of beats 2 & 4 — the "spang-a-lang".
      [1, 3].forEach(function (b) {
        evs.push({ voice: 'ride', beat: b, eighth: 1, midi: null, dur: 0.4,
                   vel: 0.6 * (0.9 + rng() * 0.2), micro: (rng() - 0.5) * 0.012 });
      });
    }
    return evs;
  }

  function hatEvents() {
    // Foot hi-hat "chick" on 2 & 4 — the anchor of the swing feel.
    return [
      { voice: 'hihat', beat: 1, eighth: 0, midi: null, dur: 0.2, vel: 1.0, micro: 0 },
      { voice: 'hihat', beat: 3, eighth: 0, midi: null, dur: 0.2, vel: 1.0, micro: 0 }
    ];
  }

  function kickEvents(feel, rng) {
    var f = FEELS[feel] || FEELS.medium;
    if (f.kick === 'sparse') {
      return [
        { voice: 'kick', beat: 0, eighth: 0, midi: null, dur: 0.2, vel: 0.42, micro: 0 },
        { voice: 'kick', beat: 2, eighth: 0, midi: null, dur: 0.2, vel: 0.30, micro: 0 }
      ];
    }
    // Feathered bass drum — barely audible on all four (the bebop convention).
    return [0, 1, 2, 3].map(function (b) {
      return { voice: 'kick', beat: b, eighth: 0, midi: null, dur: 0.2,
               vel: (b === 0 ? 0.5 : (b === 2 ? 0.28 : 0.18)) * (0.9 + rng() * 0.15), micro: 0 };
    });
  }

  /* ── buildBarPlan — assemble the full per-bar event plan ── */
  function buildBarPlan(opts) {
    opts = opts || {};
    var feel = FEELS[opts.feel] ? opts.feel : 'medium';
    var bpm = (typeof opts.bpm === 'number' && opts.bpm > 0) ? opts.bpm : 120;
    var barIndex = opts.barIndex | 0;
    var seed = (opts.seed == null ? 0x9E3779B1 : opts.seed) ^ (barIndex * 0x85EBCA77);
    var rng = makeRng(seed);

    var rootPc = noteToPc(opts.root);
    var qual = qualityOf(opts.chord);
    // No next root (final bar, no loop) → approach the current root (turnaround feel).
    var nextRootPc = (opts.nextRoot == null || opts.nextRoot === '')
      ? rootPc : noteToPc(opts.nextRoot);

    var swing = swingRatio(bpm, feel);

    // Bass line.
    var bass = walkingBass(rootPc, qual, nextRootPc, opts.prevBassMidi, rng);
    var bassEvents = bass.map(function (n, i) {
      return {
        voice: 'bass', beat: n.beat, eighth: 0, midi: n.midi,
        dur: 0.9,
        vel: (i === 0 ? 0.95 : 0.85) * (0.94 + rng() * 0.1),
        micro: (rng() - 0.5) * 0.008     // bass stays steady — tiny shifts only
      };
    });

    // Comp voicing + rhythm.
    var voicing = guideVoicing(rootPc, qual, opts.prevCompTop);
    var patternKey = pickCompPattern(feel, rng);
    var pattern = COMP_PATTERNS[patternKey];
    var compEvents = [];
    pattern.forEach(function (hit) {
      var hitVel = 0.55 + rng() * 0.28;
      // Comping lays slightly behind the beat — a musician's push/drag.
      var micro = 0.012 + rng() * 0.03;
      voicing.forEach(function (midi, vi) {
        compEvents.push({
          voice: 'comp', beat: hit.beat, eighth: hit.eighth, midi: midi,
          dur: (hit.eighth ? 0.45 : 0.6),
          vel: hitVel * (vi === 2 ? 0.8 : 1.0),   // 9th slightly softer
          micro: micro + vi * 0.004               // gentle roll across the voicing
        });
      });
    });

    var events = []
      .concat(rideEvents(feel, rng))
      .concat(hatEvents())
      .concat(kickEvents(feel, rng))
      .concat(bassEvents)
      .concat(compEvents);

    return {
      swing: swing,
      feel: feel,
      bpm: bpm,
      quality: qual,
      compPattern: patternKey,
      bassMidi: bass.map(function (n) { return n.midi; }),
      compVoicing: voicing,
      events: events
    };
  }

  root.BebopGroove = {
    buildBarPlan: buildBarPlan,
    swingRatio: swingRatio,
    walkingBass: walkingBass,
    guideVoicing: guideVoicing,
    qualityOf: qualityOf,
    noteToPc: noteToPc,
    FEELS: FEELS,
    CHORD_TONES: CHORD_TONES,
    GUIDE_TONES: GUIDE_TONES
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
