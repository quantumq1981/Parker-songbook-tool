(function (global) {
  const BEBOP_ESSENTIALS = {
    voicings: {
      // ── Major 7 (Δ7) ──────────────────────────────────────────────────────────
      // CΔ7: C(R) E(3) G(5) B(7) — Shell: S6f8=C, S4f9=B, S3f9=E | Root5: S5f3=C, S4f5=G, S3f4=B, S2f5=E
      'CΔ7': [
        { name: 'CΔ7 (Shell)',  fingers: [[6, 8, 'R'], [4, 9, '7'], [3, 9, '3']], baseFret: 8 },
        { name: 'CΔ7 (Root 5)', fingers: [[5, 3, 'R'], [4, 5, '5'], [3, 4, '7'], [2, 5, '3']], baseFret: 3 }
      ],
      // FΔ7: F(R) A(3) C(5) E(7) — Shell: S6f1=F, S4f2=E, S3f2=A | Root5: S5f8=F, S4f10=C, S3f9=E, S2f10=A
      'FΔ7': [
        { name: 'FΔ7 (Shell)',  fingers: [[6, 1, 'R'], [4, 2, '7'], [3, 2, '3']], baseFret: 1 },
        { name: 'FΔ7 (Root 5)', fingers: [[5, 8, 'R'], [4, 10, '5'], [3, 9, '7'], [2, 10, '3']], baseFret: 8 }
      ],
      // BbΔ7: Bb(R) D(3) F(5) A(7)
      'BbΔ7': [
        { name: 'BbΔ7 (Shell)',  fingers: [[6, 6, 'R'], [4, 7, '7'], [3, 7, '3']], baseFret: 6 },
        { name: 'BbΔ7 (Root 5)', fingers: [[5, 1, 'R'], [4, 3, '5'], [3, 2, '7'], [2, 3, '3']], baseFret: 1 }
      ],
      // EbΔ7: Eb(R) G(3) Bb(5) D(7)
      'EbΔ7': [
        { name: 'EbΔ7 (Root 5)', fingers: [[5, 6, 'R'], [4, 8, '5'], [3, 7, '7'], [2, 8, '3']], baseFret: 6 }
      ],

      // ── Dominant 7 ────────────────────────────────────────────────────────────
      // G7: G(R) B(3) D(5) F(b7)
      G7: [
        { name: 'G7 (Shell)',  fingers: [[6, 3, 'R'], [4, 3, 'b7'], [3, 4, '3']], baseFret: 1 },
        { name: 'G7 (Root 5)', fingers: [[5, 10, 'R'], [4, 12, '5'], [3, 10, 'b7'], [2, 12, '3']], baseFret: 10 }
      ],
      // F7: F(R) A(3) C(5) Eb(b7)
      F7: [
        { name: 'F7 (Shell)',  fingers: [[6, 1, 'R'], [4, 1, 'b7'], [3, 2, '3']], baseFret: 1 },
        { name: 'F7 (Root 5)', fingers: [[5, 8, 'R'], [4, 10, '5'], [3, 8, 'b7'], [2, 10, '3']], baseFret: 8 }
      ],
      // Ab7: Ab(R) C(3) Eb(5) Gb(b7)
      Ab7: [
        { name: 'Ab7 (Shell)',  fingers: [[6, 4, 'R'], [4, 4, 'b7'], [3, 5, '3']], baseFret: 4 },
        { name: 'Ab7 (Root 5)', fingers: [[5, 11, 'R'], [4, 13, '5'], [3, 11, 'b7'], [2, 13, '3']], baseFret: 11 }
      ],
      // D7: D(R) F#(3) A(5) C(b7)
      D7: [
        { name: 'D7 (Shell)', fingers: [[5, 5, 'R'], [4, 4, '3'], [3, 5, 'b7']], baseFret: 4 }
      ],

      // ── Minor 7 (m7) ──────────────────────────────────────────────────────────
      // Cm7: C(R) Eb(b3) G(5) Bb(b7)
      Cm7: [
        { name: 'Cm7 (Root 6)', fingers: [[6, 8, 'R'], [4, 8, 'b7'], [3, 8, 'b3']], baseFret: 8 },
        { name: 'Cm7 (Root 5)', fingers: [[5, 3, 'R'], [4, 5, '5'], [3, 3, 'b7'], [2, 4, 'b3']], baseFret: 3 }
      ],
      // Dm7: D(R) F(b3) A(5) C(b7)
      Dm7: [
        { name: 'Dm7 (Root 5)', fingers: [[5, 5, 'R'], [4, 7, '5'], [3, 5, 'b7'], [2, 6, 'b3']], baseFret: 5 }
      ],
      // Am7: A(R) C(b3) E(5) G(b7)
      Am7: [
        { name: 'Am7 (Shell)', fingers: [[6, 5, 'R'], [4, 5, 'b7'], [3, 5, 'b3']], baseFret: 5 }
      ],

      // ── Half-Diminished / m7b5 (ø7) ───────────────────────────────────────────
      // Em7b5: E(R) G(b3) Bb(b5) D(b7) — S5f7=E, S4f8=Bb, S3f7=D, S2f8=G
      'Em7b5': [
        { name: 'Em7b5 (Root 5)', fingers: [[5, 7, 'R'], [4, 8, 'b5'], [3, 7, 'b7'], [2, 8, 'b3']], baseFret: 7 }
      ],
      // Bm7b5: B(R) D(b3) F(b5) A(b7) — S5f2=B, S4f3=F, S3f2=A, S2f3=D
      'Bm7b5': [
        { name: 'Bm7b5 (Root 5)', fingers: [[5, 2, 'R'], [4, 3, 'b5'], [3, 2, 'b7'], [2, 3, 'b3']], baseFret: 2 }
      ],

      // ── Diminished 7 ──────────────────────────────────────────────────────────
      // Bdim7: B(R) D(b3) F(b5) Ab(bb7)
      // S5f2=B(R), S4f3=F(b5), S3f1=Ab(bb7), S2f3=D(b3) — frets 1-3, compact
      // Dim7 is symmetric: transposing by 1-3 semitones covers all 12 roots
      Bdim7: [
        { name: 'Bdim7', fingers: [[5, 2, 'R'], [4, 3, 'b5'], [3, 1, 'bb7'], [2, 3, 'b3']], baseFret: 1 }
      ]
    }
  };

  global.JAZZ_CHORDS = BEBOP_ESSENTIALS.voicings;
  global.JazzChordDatabase = BEBOP_ESSENTIALS;
})(typeof window !== 'undefined' ? window : globalThis);
