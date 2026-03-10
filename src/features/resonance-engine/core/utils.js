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
  '1': 0, b2: 1, '#1': 1, '2': 2, '#2': 3, b3: 3, '3': 4, '4': 5, '#4': 6, b5: 6,
  '5': 7, '#5': 8, b6: 8, '6': 9, bb7: 9, b7: 10, '7': 11, b9: 1, '9': 2, '#9': 3,
  '11': 5, '#11': 6, b13: 8, '13': 9
};

function noteToPitchClass(note) {
  return NOTE_TO_PC[note] ?? 0;
}

function pitchClassToNote(pc) {
  return PC_TO_NOTE[((pc % 12) + 12) % 12];
}

function semitoneToDegree(semitone) {
  const normalized = ((semitone % 12) + 12) % 12;
  const map = {
    0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: '#4', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7'
  };
  return map[normalized];
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
  const total = items.reduce((sum, x) => sum + x.weight, 0);
  let n = random() * total;
  for (const item of items) {
    n -= item.weight;
    if (n <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function degreeToSemitone(degree) {
  return DEGREE_TO_SEMITONE[degree];
}

function midiFromNoteName(noteName, octave = 4) {
  const pc = noteToPitchClass(noteName);
  return (octave + 1) * 12 + pc;
}

function noteNameFromMidi(midi) {
  return `${pitchClassToNote(midi % 12)}${Math.floor(midi / 12) - 1}`;
}

module.exports = {
  noteToPitchClass,
  pitchClassToNote,
  semitoneToDegree,
  mulberry32,
  chooseWeighted,
  degreeToSemitone,
  midiFromNoteName,
  noteNameFromMidi
};
