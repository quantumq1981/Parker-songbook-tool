const DEMO_SCALES = {
  ionian: {
    id: 'ionian',
    name: 'Ionian',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degrees: ['1', '2', '3', '4', '5', '6', '7']
  },
  major_bebop: {
    id: 'major_bebop',
    name: 'Major Bebop',
    intervals: [0, 2, 4, 5, 7, 8, 9, 11],
    degrees: ['1', '2', '3', '4', '5', '#5', '6', '7']
  },
  dominant_bebop: {
    id: 'dominant_bebop',
    name: 'Dominant Bebop',
    intervals: [0, 2, 4, 5, 7, 9, 10, 11],
    degrees: ['1', '2', '3', '4', '5', '6', 'b7', '7']
  },
  dorian_bebop: {
    id: 'dorian_bebop',
    name: 'Dorian Bebop',
    intervals: [0, 2, 3, 4, 5, 7, 9, 10],
    degrees: ['1', '2', 'b3', '3', '4', '5', '6', 'b7']
  },
  altered: {
    id: 'altered',
    name: 'Altered',
    intervals: [0, 1, 3, 4, 6, 8, 10],
    degrees: ['1', 'b9', '#9', '3', 'b5', '#5', 'b7']
  },
  harmonic_minor: {
    id: 'harmonic_minor',
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    degrees: ['1', '2', 'b3', '4', '5', 'b6', '7']
  }
};

module.exports = { DEMO_SCALES };
