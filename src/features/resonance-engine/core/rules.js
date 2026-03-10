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
  harmonic_minor: 'harmonic_minor'
};

function getFunctionalRole(degree) {
  if (degree === '1') return 'root';
  if (['2', '4', 'b2', '#4', '9', '11', 'b9', '#11'].includes(degree)) return 'subdominant';
  if (['5', '7', 'b7'].includes(degree)) return 'dominant';
  return 'other';
}

function tonicChordTonesForType(type = 'maj7') {
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

module.exports = { GRAVITY_RULES, SCALE_ALIAS_MAP, getFunctionalRole, tonicChordTonesForType };
