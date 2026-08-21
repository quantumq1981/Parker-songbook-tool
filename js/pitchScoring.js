(function (root) {
  'use strict';

  var WEIGHT = { chordTone: 1.0, scaleTone: 0.6, guideTone: 1.25, outside: 0.0 };

  function gradeNote(pc, cents, chordPcs, scalePcs, guidePcs) {
    var category =
      guidePcs.has(pc)  ? 'guideTone' :
      chordPcs.has(pc)  ? 'chordTone' :
      scalePcs.has(pc)  ? 'scaleTone' : 'outside';
    var intonation = Math.max(0, 1 - Math.max(0, Math.abs(cents) - 10) / 40);
    return { weight: WEIGHT[category], category: category, intonation: intonation };
  }

  function scoreBar(graded) {
    if (!graded.length) return null;
    var max = graded.length * WEIGHT.guideTone;
    var got = graded.reduce(function (a, g) { return a + g.weight * g.intonation; }, 0);
    return Math.round((got / max) * 100);
  }

  root.PitchScoring = { gradeNote: gradeNote, scoreBar: scoreBar, WEIGHT: WEIGHT };
})(typeof globalThis !== 'undefined' ? globalThis : window);
