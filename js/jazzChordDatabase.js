(function (global) {
  const BEBOP_ESSENTIALS = {
    voicings: {
      'BbΔ7': [
        { name: 'BbΔ7 (Shell)', fingers: [[6, 6, 'R'], [4, 7, '7'], [3, 7, '3']], baseFret: 6 },
        { name: 'BbΔ7 (Root 5)', fingers: [[5, 1, 'R'], [4, 3, '5'], [3, 2, '7'], [2, 3, '3']], baseFret: 1 }
      ],
      G7: [
        { name: 'G7 (Shell)', fingers: [[6, 3, 'R'], [4, 3, 'b7'], [3, 4, '3']], baseFret: 1 },
        { name: 'G7 (Root 5)', fingers: [[5, 10, 'R'], [4, 12, '5'], [3, 10, 'b7'], [2, 12, '3']], baseFret: 10 }
      ],
      Cm7: [
        { name: 'Cm7 (Root 6)', fingers: [[6, 8, 'R'], [4, 8, 'b7'], [3, 8, 'b3']], baseFret: 8 },
        { name: 'Cm7 (Root 5)', fingers: [[5, 3, 'R'], [4, 5, '5'], [3, 3, 'b7'], [2, 4, 'b3']], baseFret: 3 }
      ],
      F7: [
        { name: 'F7 (Shell)', fingers: [[6, 1, 'R'], [4, 1, 'b7'], [3, 2, '3']], baseFret: 1 },
        { name: 'F7 (Root 5)', fingers: [[5, 8, 'R'], [4, 10, '5'], [3, 8, 'b7'], [2, 10, '3']], baseFret: 8 }
      ],
      Ab7: [
        { name: 'Ab7 (Shell)', fingers: [[6, 4, 'R'], [4, 4, 'b7'], [3, 5, '3']], baseFret: 4 },
        { name: 'Ab7 (Root 5)', fingers: [[5, 11, 'R'], [4, 13, '5'], [3, 11, 'b7'], [2, 13, '3']], baseFret: 11 }
      ],
      Dm7: [
        { name: 'Dm7 (Root 5)', fingers: [[5, 5, 'R'], [4, 7, '5'], [3, 5, 'b7'], [2, 6, 'b3']], baseFret: 5 }
      ],
      D7: [
        { name: 'D7 (Shell)', fingers: [[5, 5, 'R'], [4, 4, '3'], [3, 5, 'b7']], baseFret: 5 }
      ],
      'EbΔ7': [
        { name: 'EbΔ7 (Root 5)', fingers: [[5, 6, 'R'], [4, 8, '5'], [3, 7, '7'], [2, 8, '3']], baseFret: 6 }
      ],
      Am7: [
        { name: 'Am7 (Shell)', fingers: [[6, 5, 'R'], [4, 5, 'b7'], [3, 5, 'b3']], baseFret: 5 }
      ]
    }
  };

  global.JAZZ_CHORDS = BEBOP_ESSENTIALS.voicings;
  global.JazzChordDatabase = BEBOP_ESSENTIALS;
})(typeof window !== 'undefined' ? window : globalThis);
