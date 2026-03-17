/**
 * resonanceEngine.js
 * Browser-compatible bundle of the Universal Resonance Engine.
 * Converted from CommonJS modules to a single IIFE.
 * Exports window.ResonanceEngine for use in the main app.
 */
(function () {
  'use strict';

  /* =========================================================
     utils
  ========================================================= */
  const NOTE_TO_PC = {
    C: 0, 'B#': 0,
    'C#': 1, Db: 1,
    D: 2,
    'D#': 3, Eb: 3,
    E: 4, Fb: 4,
    F: 5, 'E#': 5,
    'F#': 6, Gb: 6,
    G: 7,
    'G#': 8, Ab: 8,
    A: 9,
    'A#': 10, Bb: 10,
    B: 11, Cb: 11
  };

  const PC_TO_NOTE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const DEGREE_TO_SEMITONE = {
    '1': 0, b2: 1, '#1': 1, '2': 2, '#2': 3, b3: 3, '3': 4, '4': 5,
    '#4': 6, b5: 6, '5': 7, '#5': 8, b6: 8, '6': 9, bb7: 9, b7: 10,
    '7': 11, b9: 1, '9': 2, '#9': 3, '11': 5, '#11': 6, b13: 8, '13': 9
  };

  function noteToPitchClass(note) {
    return NOTE_TO_PC[note] !== undefined ? NOTE_TO_PC[note] : 0;
  }

  function pitchClassToNote(pc) {
    return PC_TO_NOTE[((pc % 12) + 12) % 12];
  }

  function semitoneToDegree(semitone) {
    const normalized = ((semitone % 12) + 12) % 12;
    const map = {
      0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4',
      6: '#4', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7'
    };
    return map[normalized];
  }

  function degreeToSemitone(degree) {
    return DEGREE_TO_SEMITONE[degree];
  }

  function mulberry32(seed) {
    let t = seed;
    return function random() {
      t += 0x6D2B79F5;
      let v = Math.imul(t ^ (t >>> 15), 1 | t);
      v ^= v + Math.imul(v ^ (v >>> 7), 61 | v);
      return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
    };
  }

  function chooseWeighted(items, random) {
    const total = items.reduce(function (sum, x) { return sum + x.weight; }, 0);
    let n = random() * total;
    for (let i = 0; i < items.length; i++) {
      n -= items[i].weight;
      if (n <= 0) return items[i].value;
    }
    return items[items.length - 1].value;
  }

  function midiFromNoteName(noteName, octave) {
    if (octave === undefined) octave = 4;
    const pc = noteToPitchClass(noteName);
    return (octave + 1) * 12 + pc;
  }

  function noteNameFromMidi(midi) {
    return pitchClassToNote(midi % 12) + (Math.floor(midi / 12) - 1);
  }

  /* =========================================================
     rules
  ========================================================= */
  const GRAVITY_RULES = {
    ionian: {
      tenseNotes: ['4', '7'],
      resolutionMap: { '4': ['3', '5'], '7': ['1'] },
      tonicChordType: 'maj7'
    },
    major_bebop: {
      tenseNotes: ['#5'],
      resolutionMap: { '#5': ['5', '6'] },
      passingTones: ['#5'],
      tonicChordType: 'maj7'
    },
    dominant_bebop: {
      tenseNotes: ['7', '4'],
      resolutionMap: { '7': ['1', 'b7'], '4': ['3'] },
      passingTones: ['7'],
      tonicChordType: '7'
    },
    dorian_bebop: {
      tenseNotes: ['3'],
      resolutionMap: { '3': ['b3', '4'] },
      passingTones: ['3'],
      tonicChordType: 'm7'
    },
    altered: {
      tenseNotes: ['b9', '#9', 'b5', '#5'],
      resolutionMap: {
        b9: ['1', '3'],
        '#9': ['3', '1'],
        b5: ['5', '3'],
        '#5': ['5', '1']
      },
      tonicChordType: '7'
    },
    harmonic_minor: {
      tenseNotes: ['b6', '7'],
      resolutionMap: { b6: ['5'], '7': ['1'] },
      tonicChordType: 'mMaj7'
    },
    // --- New scale rules ---
    dorian: {
      // m7 chord tones: 1, b3, 5, b7. Natural 2 and 6 are characteristic tensions.
      // 2 (passing tone) resolves to 1 or b3; 6 (color tone) resolves to 5 or b7.
      tenseNotes: ['2', '6'],
      resolutionMap: { '2': ['1', 'b3'], '6': ['5', 'b7'] },
      tonicChordType: 'm7'
    },
    mixolydian: {
      // Dom7 chord tones: 1, 3, 5, b7. Avoid: 4 clashes against 3.
      // 4 resolves down to 3; 2 resolves to 1 or 3.
      tenseNotes: ['4', '2'],
      resolutionMap: { '4': ['3', '5'], '2': ['1', '3'] },
      tonicChordType: '7'
    },
    lydian_dominant: {
      // Dom7#11 chord tones: 1, 3, 5, b7. Characteristic tritone: #4.
      // #4 resolves up to 5 or down to 3; 2 resolves to 1 or 3.
      tenseNotes: ['#4', '2'],
      resolutionMap: { '#4': ['5', '3'], '2': ['1', '3'] },
      tonicChordType: '7'
    },
    diminished: {
      // Dim7 chord tones: 1, b3, b5, 6 (symmetric half-whole scale).
      // Passing tones b2 and 3 are very tense against the dim chord.
      // b2 resolves to 1 or b3; 3 resolves to b3 or b5.
      tenseNotes: ['b2', '3'],
      resolutionMap: { 'b2': ['1', 'b3'], '3': ['b3', 'b5'] },
      tonicChordType: 'dim'
    },
    locrian: {
      // m7b5 chord tones: 1, b3, b5, b7. Scale degrees: 1 b2 b3 4 b5 b6 b7.
      // b2 is the most characteristic tension — a semitone above the root, strong pull to 1.
      // b6 is a passing color tone; resolves to b7 or b5 (both chord tones).
      tenseNotes: ['b2', 'b6'],
      resolutionMap: { 'b2': ['1', 'b3'], 'b6': ['b7', 'b5'] },
      tonicChordType: 'm7b5'
    },
    phrygian: {
      // m7 chord tones: 1, b3, 5, b7. Scale degrees: 1 b2 b3 4 5 b6 b7.
      // b2 is the defining Spanish/flamenco tension — resolves strongly down to 1.
      // b6 (minor 6th) is an unstable passing tone; resolves to 5 or b7.
      tenseNotes: ['b2', 'b6'],
      resolutionMap: { 'b2': ['1', 'b3'], 'b6': ['5', 'b7'] },
      tonicChordType: 'm7'
    },
    lydian: {
      // maj7 chord tones: 1, 3, 5, 7. Scale degrees: 1 2 3 #4 5 6 7.
      // #4 is the tritone — the hallmark of Lydian — resolves up to 5 or down to 3.
      // 2 is a passing tone between 1 and 3; resolves to 1 or 3.
      tenseNotes: ['#4', '2'],
      resolutionMap: { '#4': ['5', '3'], '2': ['1', '3'] },
      tonicChordType: 'maj7'
    }
  };

  const SCALE_ALIAS_MAP = {
    ionian: 'ionian',
    major: 'ionian',
    major_bebop: 'major_bebop',
    bebop_major: 'major_bebop',
    dominant_bebop: 'dominant_bebop',
    bebop_dominant: 'dominant_bebop',
    dorian_bebop: 'dorian_bebop',
    bebop_dorian: 'dorian_bebop',
    altered: 'altered',
    super_locrian: 'altered',
    harmonic_minor: 'harmonic_minor',
    dorian: 'dorian',
    mixolydian: 'mixolydian',
    lydian_dominant: 'lydian_dominant',
    diminished: 'diminished',
    locrian: 'locrian',
    phrygian: 'phrygian',
    lydian: 'lydian'
  };

  function getFunctionalRole(degree) {
    if (degree === '1') return 'root';
    if (['2', '4', 'b2', '#4', '9', '11', 'b9', '#11'].indexOf(degree) !== -1) return 'subdominant';
    if (['5', '7', 'b7'].indexOf(degree) !== -1) return 'dominant';
    return 'other';
  }

  function tonicChordTonesForType(type) {
    if (!type) type = 'maj7';
    const lookup = {
      maj7: ['1', '3', '5', '7'],
      '7': ['1', '3', '5', 'b7'],
      m7: ['1', 'b3', '5', 'b7'],
      mMaj7: ['1', 'b3', '5', '7'],
      dim: ['1', 'b3', 'b5', '6'],
      m7b5: ['1', 'b3', 'b5', 'b7']
    };
    return lookup[type] || lookup.maj7;
  }

  /* =========================================================
     gravityEngine
  ========================================================= */
  function normalizeScale(scale) {
    const mappedId = SCALE_ALIAS_MAP[scale.id] || scale.id;
    const rules = GRAVITY_RULES[mappedId] || {};
    return Object.assign({}, scale, rules, { id: mappedId }, scale);
  }

  function closestDegree(targetDegree, availableDegrees) {
    const targetSemitone = degreeToSemitone(targetDegree);
    if (availableDegrees.indexOf(targetDegree) !== -1) return targetDegree;
    let best = availableDegrees[0];
    let bestDistance = 99;
    for (let i = 0; i < availableDegrees.length; i++) {
      const degree = availableDegrees[i];
      const s = degreeToSemitone(degree);
      if (s == null || targetSemitone == null) continue;
      const d = Math.min((s - targetSemitone + 12) % 12, (targetSemitone - s + 12) % 12);
      if (d < bestDistance) { bestDistance = d; best = degree; }
    }
    return best;
  }

  function buildGravityMap(key, scaleInput) {
    const scale = normalizeScale(scaleInput);
    const tonicPc = noteToPitchClass(key);
    const intervals = scale.intervals || [];
    const degrees = (scale.degrees && scale.degrees.length === intervals.length)
      ? scale.degrees
      : intervals.map(semitoneToDegree);

    const chordToneCandidates = tonicChordTonesForType(scale.tonicChordType);
    const tonicChordTones = chordToneCandidates.map(function (d) { return closestDegree(d, degrees); });

    const pulseLookup = { stable: 2000, moderate: 1400, tense: 800, 'very-tense': 500 };

    const notes = intervals.map(function (interval, idx) {
      const degree = degrees[idx];
      const noteNameVal = pitchClassToNote((tonicPc + interval) % 12);
      const isChordTone = tonicChordTones.indexOf(degree) !== -1;
      const isTense = (scale.tenseNotes || []).indexOf(degree) !== -1;
      const isPassing = (scale.passingTones || []).indexOf(degree) !== -1;
      let stability = 'moderate';
      if (isChordTone) stability = 'stable';
      if (isTense) stability = 'tense';
      if (isPassing || (scale.id === 'altered' && isTense)) stability = 'very-tense';
      return {
        pitchClass: (tonicPc + interval) % 12,
        noteName: noteNameVal,
        degree: degree,
        functionalRole: getFunctionalRole(degree),
        isChordTone: isChordTone,
        isTense: isTense,
        stability: stability,
        pulseMs: pulseLookup[stability],
        resolvesTo: (scale.resolutionMap && scale.resolutionMap[degree]) || []
      };
    });

    const arrows = [];
    for (let ni = 0; ni < notes.length; ni++) {
      const note = notes[ni];
      for (let ri = 0; ri < note.resolvesTo.length; ri++) {
        const targetDegree = note.resolvesTo[ri];
        let target = null;
        for (let ti = 0; ti < notes.length; ti++) {
          if (notes[ti].degree === targetDegree) { target = notes[ti]; break; }
        }
        if (!target) continue;
        arrows.push({
          fromDegree: note.degree,
          toDegree: targetDegree,
          fromNote: note.noteName,
          toNote: target.noteName,
          weight: note.stability === 'very-tense' ? 1 : 0.75
        });
      }
    }

    return { key: key, scaleId: scale.id, tonicChordTones: tonicChordTones, notes: notes, arrows: arrows };
  }

  /* =========================================================
     lickGenerator
  ========================================================= */
  function validateLick(lick, gravityMap, degreeSet) {
    const first = lick.notes[0];
    const last = lick.notes[lick.notes.length - 1];
    let firstNote = null;
    for (let i = 0; i < gravityMap.notes.length; i++) {
      if (gravityMap.notes[i].degree === first.degree) { firstNote = gravityMap.notes[i]; break; }
    }
    const containsTense = lick.notes.some(function (n) { return n.isTense; });
    return firstNote && firstNote.functionalRole === 'subdominant'
      && containsTense
      && last.degree === '1'
      && gravityMap.tonicChordTones.indexOf(last.degree) !== -1
      && lick.notes.every(function (n) { return degreeSet.has(n.degree); });
  }

  function generateLick(input) {
    const gravityMap = input.gravityMap;
    const length = input.length !== undefined ? input.length : 6;
    const octaveRange = input.octaveRange || [4, 5];
    const seed = input.seed !== undefined ? input.seed : 42;

    const random = mulberry32(seed);
    const scaleNotes = gravityMap.notes;
    const degreeSet = new Set(scaleNotes.map(function (n) { return n.degree; }));
    const subdominantPool = scaleNotes.filter(function (n) { return n.functionalRole === 'subdominant'; });
    const tensePool = scaleNotes.filter(function (n) { return n.isTense; });
    let rootNote = null;
    for (let i = 0; i < scaleNotes.length; i++) {
      if (scaleNotes[i].degree === '1') { rootNote = scaleNotes[i]; break; }
    }
    if (!rootNote) rootNote = scaleNotes[0];

    const tryBuild = function () {
      let current = subdominantPool[Math.floor(random() * subdominantPool.length)] || scaleNotes[0];
      const notes = [];
      let currentMidi = midiFromNoteName(current.noteName, octaveRange[0]);

      for (let i = 0; i < length - 1; i++) {
        notes.push({
          note: noteNameFromMidi(currentMidi),
          degree: current.degree,
          duration: 0.5,
          midi: currentMidi,
          isTense: current.isTense
        });
        const idx = scaleNotes.findIndex(function (n) { return n.degree === current.degree; });
        const stepOptions = [
          scaleNotes[(idx + 1) % scaleNotes.length],
          scaleNotes[(idx - 1 + scaleNotes.length) % scaleNotes.length]
        ];
        const leapOptions = scaleNotes.filter(function (n) { return n.isChordTone; });
        const contOptions = scaleNotes.filter(function (n) { return n.degree !== current.degree; });

        let next;
        if (current.isTense && current.resolvesTo.length) {
          next = null;
          for (let ri = 0; ri < scaleNotes.length; ri++) {
            if (current.resolvesTo.indexOf(scaleNotes[ri].degree) !== -1) { next = scaleNotes[ri]; break; }
          }
          if (!next) next = stepOptions[0];
        } else {
          next = chooseWeighted([
            { value: stepOptions[Math.floor(random() * stepOptions.length)], weight: 60 },
            { value: leapOptions[Math.floor(random() * leapOptions.length)] || scaleNotes[0], weight: 20 },
            { value: contOptions[Math.floor(random() * contOptions.length)] || scaleNotes[0], weight: 20 }
          ], random);
        }

        if (next && next.degree === current.degree) next = stepOptions[0];
        if (!next) next = stepOptions[0];

        const targetMidi = midiFromNoteName(next.noteName, Math.floor(currentMidi / 12) - 1);
        const lo = midiFromNoteName('C', octaveRange[0]);
        const hi = midiFromNoteName('B', octaveRange[1]);
        currentMidi = Math.max(lo, Math.min(hi, targetMidi));
        current = next;
      }

      const finalMidi = midiFromNoteName(rootNote.noteName, octaveRange[0]);
      notes.push({ note: noteNameFromMidi(finalMidi), degree: '1', duration: 0.5, midi: finalMidi, isTense: false });

      const containsTenseNote = notes.some(function (n) { return n.isTense; });
      return {
        id: 'lick-' + seed + '-' + Math.floor(random() * 100000),
        key: gravityMap.key,
        scaleId: gravityMap.scaleId,
        notes: notes,
        containsTenseNote: containsTenseNote,
        startsOnSubdominant: subdominantPool.some(function (n) { return n.degree === notes[0].degree; }),
        endsOnRoot: notes[notes.length - 1].degree === '1'
      };
    };

    for (let attempt = 0; attempt < 50; attempt++) {
      const lick = tryBuild();
      if (validateLick(lick, gravityMap, degreeSet)) return lick;
    }

    const repaired = tryBuild();
    if (!repaired.containsTenseNote && tensePool.length) {
      const t = tensePool[0];
      const insertIdx = Math.max(1, repaired.notes.length - 3);
      repaired.notes[insertIdx] = {
        note: t.noteName + octaveRange[0],
        degree: t.degree,
        duration: 0.5,
        midi: midiFromNoteName(t.noteName, octaveRange[0]),
        isTense: true
      };
    }
    if (subdominantPool.length) repaired.notes[0].degree = subdominantPool[0].degree;
    repaired.notes[repaired.notes.length - 1].degree = '1';
    repaired.containsTenseNote = repaired.notes.some(function (n) { return n.isTense; });
    repaired.startsOnSubdominant = true;
    repaired.endsOnRoot = true;
    return repaired;
  }

  /* =========================================================
     fretboardMapper
  ========================================================= */
  const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

  function parseScientific(note) {
    const match = /^([A-G][b#]?)(\d)$/.exec(note);
    if (!match) return { noteName: 'C', octave: 4 };
    return { noteName: match[1], octave: Number(match[2]) };
  }

  function candidatePositionsForPc(pc, tuning, maxFret) {
    const positions = [];
    tuning.forEach(function (open, i) {
      const parsed = parseScientific(open);
      const openMidi = midiFromNoteName(parsed.noteName, parsed.octave);
      for (let fret = 0; fret <= maxFret; fret++) {
        if ((openMidi + fret) % 12 === pc) {
          positions.push({ string: i + 1, fret: fret, midi: openMidi + fret });
        }
      }
    });
    return positions;
  }

  function mapLickToFretboard(lick, options) {
    if (!options) options = {};
    const tuning = options.tuning || STANDARD_TUNING;
    const maxFret = options.maxFret !== undefined ? options.maxFret : 12;
    const positionBias = options.positionBias !== undefined ? options.positionBias : 5;

    let last = null;
    return lick.notes.map(function (n) {
      const notePart = n.note.replace(/\d+$/, '');
      const pc = noteToPitchClass(notePart);
      const candidates = candidatePositionsForPc(pc, tuning, maxFret);
      candidates.sort(function (a, b) {
        if (!last) return Math.abs(a.fret - positionBias) - Math.abs(b.fret - positionBias);
        return (Math.abs(a.fret - last.fret) + Math.abs(a.string - last.string))
          - (Math.abs(b.fret - last.fret) + Math.abs(b.string - last.string));
      });
      const chosen = candidates[0] || { string: 1, fret: 0, midi: 60 };
      last = chosen;
      return {
        noteName: notePart,
        degree: n.degree,
        fret: chosen.fret,
        string: chosen.string,
        octave: Math.floor(chosen.midi / 12) - 1,
        layer: 'active',
        isTense: n.isTense,
        midi: n.midi
      };
    });
  }

  function mapGhostChordTonesToFretboard(gravityMap, options) {
    if (!options) options = {};
    const tuning = options.tuning || STANDARD_TUNING;
    const maxFret = options.maxFret !== undefined ? options.maxFret : 12;
    const chordToneNotes = gravityMap.notes.filter(function (n) {
      return gravityMap.tonicChordTones.indexOf(n.degree) !== -1;
    });
    const out = [];
    for (let ci = 0; ci < chordToneNotes.length; ci++) {
      const tone = chordToneNotes[ci];
      const positions = candidatePositionsForPc(tone.pitchClass, tuning, maxFret).slice(0, 4);
      for (let pi = 0; pi < positions.length; pi++) {
        const pos = positions[pi];
        out.push({
          noteName: tone.noteName,
          degree: tone.degree,
          fret: pos.fret,
          string: pos.string,
          layer: 'ghost',
          stability: tone.stability,
          isChordTone: true,
          isTense: tone.isTense
        });
      }
    }
    return out;
  }

  /* =========================================================
     playbackMapper
  ========================================================= */
  function mapLickToPlaybackEvents(lick) {
    let time = 0;
    return lick.notes.map(function (n) {
      const evt = { note: n.note, duration: n.duration, time: time, midi: n.midi };
      time += n.duration;
      return evt;
    });
  }

  /* =========================================================
     Main orchestrator — runResonanceEngine
  ========================================================= */
  function runResonanceEngine(params) {
    try {
      const gravityMap = buildGravityMap(params.key, params.scale);
      const seed = params.seed !== undefined ? params.seed : Date.now();
      const lick = generateLick({
        gravityMap: gravityMap,
        length: params.lickLength || 6,
        seed: seed
      });
      const ghostChordTones = mapGhostChordTonesToFretboard(gravityMap, { maxFret: 12 });
      const activePath = mapLickToFretboard(lick, { maxFret: 12 });
      const pulseMap = gravityMap.notes.map(function (n) {
        return {
          noteName: n.noteName,
          pitchClass: n.pitchClass,
          degree: n.degree,
          stability: n.stability,
          pulseMs: n.pulseMs,
          intensity: n.stability === 'stable' ? 0.35
            : n.stability === 'moderate' ? 0.55
            : n.stability === 'tense' ? 0.8 : 1
        };
      });
      const playbackEvents = mapLickToPlaybackEvents(lick);
      return {
        gravityMap: gravityMap,
        lick: lick,
        ghostChordTones: ghostChordTones,
        activePath: activePath,
        pulseMap: pulseMap,
        playbackEvents: playbackEvents,
        showArrows: Boolean(params.showArrows)
      };
    } catch (err) {
      console.warn('[ResonanceEngine] Engine error:', err);
      return null;
    }
  }

  /* =========================================================
     Public API
  ========================================================= */
  window.ResonanceEngine = {
    runResonanceEngine: runResonanceEngine,
    buildGravityMap: buildGravityMap,
    generateLick: generateLick,
    mapLickToFretboard: mapLickToFretboard,
    mapGhostChordTonesToFretboard: mapGhostChordTonesToFretboard,
    mapLickToPlaybackEvents: mapLickToPlaybackEvents
  };

})();
