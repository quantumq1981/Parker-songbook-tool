const { noteToPitchClass, midiFromNoteName } = require('./utils');

const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

function parseScientific(note) {
  const match = /^([A-G][b#]?)(\d)$/.exec(note);
  if (!match) return { noteName: 'C', octave: 4 };
  return { noteName: match[1], octave: Number(match[2]) };
}

function candidatePositionsForPc(pc, tuning, maxFret) {
  const positions = [];
  tuning.forEach((open, i) => {
    const { noteName, octave } = parseScientific(open);
    const openMidi = midiFromNoteName(noteName, octave);
    for (let fret = 0; fret <= maxFret; fret++) {
      if ((openMidi + fret) % 12 === pc) {
        positions.push({ string: i + 1, fret, midi: openMidi + fret });
      }
    }
  });
  return positions;
}

function mapLickToFretboard(lick, options = {}) {
  const tuning = options.tuning || STANDARD_TUNING;
  const maxFret = options.maxFret ?? 15;
  const positionBias = options.positionBias ?? 5;

  let last = null;
  return lick.notes.map((n) => {
    const pc = noteToPitchClass(n.note.replace(/\d$/, ''));
    const candidates = candidatePositionsForPc(pc, tuning, maxFret);
    candidates.sort((a, b) => {
      if (!last) return Math.abs(a.fret - positionBias) - Math.abs(b.fret - positionBias);
      return (Math.abs(a.fret - last.fret) + Math.abs(a.string - last.string))
        - (Math.abs(b.fret - last.fret) + Math.abs(b.string - last.string));
    });
    const chosen = candidates[0] || { string: 1, fret: 0, midi: 60 };
    last = chosen;
    return {
      noteName: n.note.replace(/\d$/, ''),
      degree: n.degree,
      fret: chosen.fret,
      string: chosen.string,
      octave: Math.floor(chosen.midi / 12) - 1,
      layer: 'active',
      isTense: n.isTense
    };
  });
}

function mapGhostChordTonesToFretboard(gravityMap, options = {}) {
  const tuning = options.tuning || STANDARD_TUNING;
  const maxFret = options.maxFret ?? 12;
  const chordToneNotes = gravityMap.notes.filter((n) => gravityMap.tonicChordTones.includes(n.degree));
  const out = [];
  for (const tone of chordToneNotes) {
    const pc = tone.pitchClass;
    const positions = candidatePositionsForPc(pc, tuning, maxFret).slice(0, 4);
    for (const pos of positions) {
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

module.exports = { mapLickToFretboard, mapGhostChordTonesToFretboard };
