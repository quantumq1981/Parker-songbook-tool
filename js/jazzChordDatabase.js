(function (global) {
  const jazzChordDatabase = {
    voicings: {
      Fmaj7: [
        { name: 'FΔ7 (Shell)', fingers: [[6, 1], [4, 2], [3, 2], [2, 1]], baseFret: 1, intervals: ['R', '5', '7', '3'] },
        { name: 'FΔ7 (Drop 2)', fingers: [[4, 3], [3, 5], [2, 5], [1, 5]], baseFret: 3, intervals: ['R', '7', '3', '5'] }
      ],
      G7: [
        { name: 'G7 (Shell)', fingers: [[6, 3], [4, 3], [3, 4]], baseFret: 1, intervals: ['R', '7', '3'] },
        { name: 'G7 (Drop 2)', fingers: [[4, 3], [3, 4], [2, 3], [1, 1]], baseFret: 1, intervals: ['R', '3', '7', '5'] }
      ],
      Cm7: [
        { name: 'Cm7 (Root 6)', fingers: [[6, 8], [4, 8], [3, 8], [2, 8]], baseFret: 8, intervals: ['R', '5', 'b7', 'b3'] },
        { name: 'Cm7 (Root 5)', fingers: [[5, 3], [4, 5], [3, 3], [2, 4]], baseFret: 3, intervals: ['R', '5', 'b7', 'b3'] }
      ],
      Ab7: [
        { name: 'Ab7 (Shell)', fingers: [[6, 4], [4, 4], [3, 5]], baseFret: 4, intervals: ['R', 'b7', '3'] },
        { name: 'Ab7 (Drop 2)', fingers: [[4, 6], [3, 5], [2, 7], [1, 4]], baseFret: 4, intervals: ['R', '3', 'b7', '5'] }
      ],
      BbΔ7: [
        { name: 'BbΔ7 (Root 6)', fingers: [[6, 6], [4, 7], [3, 7], [2, 6]], baseFret: 6, intervals: ['R', '5', '7', '3'] },
        { name: 'BbΔ7 (Root 5)', fingers: [[5, 1], [4, 3], [3, 2], [2, 3]], baseFret: 1, intervals: ['R', '5', '7', '3'] }
      ],
      D7: [
        { name: 'D7 (Shell)', fingers: [[5, 5], [4, 4], [3, 5]], baseFret: 5, intervals: ['R', '3', 'b7'] },
        { name: 'D7 (Root 6)', fingers: [[6, 10], [4, 10], [3, 11]], baseFret: 10, intervals: ['R', 'b7', '3'] }
      ],
      Gm7: [
        { name: 'Gm7 (Shell)', fingers: [[6, 3], [4, 3], [3, 3]], baseFret: 3, intervals: ['R', '5', 'b3'] },
        { name: 'Gm7 (Root 5)', fingers: [[5, 10], [4, 12], [3, 10], [2, 11]], baseFret: 10, intervals: ['R', '5', 'b7', 'b3'] }
      ],
      C7: [
        { name: 'C7 (Shell)', fingers: [[5, 3], [4, 2], [3, 3]], baseFret: 3, intervals: ['R', '3', 'b7'] },
        { name: 'C7 (Root 6)', fingers: [[6, 8], [4, 8], [3, 9]], baseFret: 8, intervals: ['R', 'b7', '3'] }
      ],
      F7: [
        { name: 'F7 (Shell)', fingers: [[6, 1], [4, 1], [3, 2]], baseFret: 1, intervals: ['R', 'b7', '3'] },
        { name: 'F7 (Root 5)', fingers: [[5, 8], [4, 7], [3, 8]], baseFret: 8, intervals: ['R', '3', 'b7'] }
      ],
      Bdim7: [
        { name: 'B°7 (Passing)', fingers: [[6, 7], [4, 6], [3, 7], [2, 6]], baseFret: 6, intervals: ['R', 'b5', 'bb7', 'b3'] }
      ]
    }
  };

  global.JazzChordDatabase = jazzChordDatabase;
})(typeof window !== 'undefined' ? window : globalThis);
