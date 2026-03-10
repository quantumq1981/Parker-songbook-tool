const { GRAVITY_RULES, SCALE_ALIAS_MAP, getFunctionalRole, tonicChordTonesForType } = require('./rules');
const { noteToPitchClass, pitchClassToNote, semitoneToDegree, degreeToSemitone } = require('./utils');

function normalizeScale(scale) {
  const mappedId = SCALE_ALIAS_MAP[scale.id] || scale.id;
  return {
    ...scale,
    id: mappedId,
    ...GRAVITY_RULES[mappedId],
    ...scale
  };
}

function closestDegree(targetDegree, availableDegrees) {
  const targetSemitone = degreeToSemitone(targetDegree);
  if (availableDegrees.includes(targetDegree)) return targetDegree;
  let best = availableDegrees[0];
  let bestDistance = 99;
  for (const degree of availableDegrees) {
    const s = degreeToSemitone(degree);
    if (s == null || targetSemitone == null) continue;
    const d = Math.min((s - targetSemitone + 12) % 12, (targetSemitone - s + 12) % 12);
    if (d < bestDistance) {
      bestDistance = d;
      best = degree;
    }
  }
  return best;
}

function buildGravityMap(key, scaleInput) {
  const scale = normalizeScale(scaleInput);
  const tonicPc = noteToPitchClass(key);
  const intervals = scale.intervals || [];
  const degrees = scale.degrees && scale.degrees.length === intervals.length
    ? scale.degrees
    : intervals.map(semitoneToDegree);

  const chordToneCandidates = tonicChordTonesForType(scale.tonicChordType);
  const tonicChordTones = chordToneCandidates.map((d) => closestDegree(d, degrees));

  const notes = intervals.map((interval, idx) => {
    const degree = degrees[idx];
    const noteName = pitchClassToNote((tonicPc + interval) % 12);
    const isChordTone = tonicChordTones.includes(degree);
    const isTense = (scale.tenseNotes || []).includes(degree);
    const isPassing = (scale.passingTones || []).includes(degree);
    let stability = 'moderate';
    if (isChordTone) stability = 'stable';
    if (isTense) stability = 'tense';
    if (isPassing || (scale.id === 'altered' && isTense)) stability = 'very-tense';
    const pulseLookup = { stable: 2000, moderate: 1400, tense: 800, 'very-tense': 500 };
    return {
      pitchClass: (tonicPc + interval) % 12,
      noteName,
      degree,
      functionalRole: getFunctionalRole(degree),
      isChordTone,
      isTense,
      stability,
      pulseMs: pulseLookup[stability],
      resolvesTo: (scale.resolutionMap && scale.resolutionMap[degree]) || []
    };
  });

  const arrows = [];
  for (const note of notes) {
    for (const targetDegree of note.resolvesTo) {
      const target = notes.find((n) => n.degree === targetDegree);
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

  return {
    key,
    scaleId: scale.id,
    tonicChordTones,
    notes,
    arrows
  };
}

module.exports = { buildGravityMap, normalizeScale };
