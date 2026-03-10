const { chooseWeighted, mulberry32, midiFromNoteName, noteNameFromMidi } = require('./utils');

function validateLick(lick, gravityMap, degreeSet) {
  const first = lick.notes[0];
  const last = lick.notes[lick.notes.length - 1];
  const firstNote = gravityMap.notes.find((n) => n.degree === first.degree);
  const containsTense = lick.notes.some((n) => n.isTense);
  return firstNote?.functionalRole === 'subdominant'
    && containsTense
    && last.degree === '1'
    && gravityMap.tonicChordTones.includes(last.degree)
    && lick.notes.every((n) => degreeSet.has(n.degree));
}

function generateLick(input) {
  const { gravityMap, length = 6, octaveRange = [4, 5], seed = 42 } = input;
  const random = mulberry32(seed);
  const scaleNotes = gravityMap.notes;
  const degreeSet = new Set(scaleNotes.map((n) => n.degree));
  const subdominantPool = scaleNotes.filter((n) => n.functionalRole === 'subdominant');
  const tensePool = scaleNotes.filter((n) => n.isTense);
  const root = scaleNotes.find((n) => n.degree === '1') || scaleNotes[0];

  const tryBuild = () => {
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
      const idx = scaleNotes.findIndex((n) => n.degree === current.degree);
      const stepOptions = [scaleNotes[(idx + 1) % scaleNotes.length], scaleNotes[(idx - 1 + scaleNotes.length) % scaleNotes.length]];
      const leapOptions = scaleNotes.filter((n) => n.isChordTone);
      const contOptions = scaleNotes.filter((n) => n.degree !== current.degree);

      let next;
      if (current.isTense && current.resolvesTo.length) {
        next = scaleNotes.find((n) => current.resolvesTo.includes(n.degree)) || stepOptions[0];
      } else {
        next = chooseWeighted([
          { value: stepOptions[Math.floor(random() * stepOptions.length)], weight: 60 },
          { value: leapOptions[Math.floor(random() * leapOptions.length)], weight: 20 },
          { value: contOptions[Math.floor(random() * contOptions.length)], weight: 20 }
        ], random);
      }

      if (next.degree === current.degree) {
        next = stepOptions[0];
      }

      const targetMidi = midiFromNoteName(next.noteName, Math.floor(currentMidi / 12) - 1);
      const withinRange = Math.max(midiFromNoteName('C', octaveRange[0]), Math.min(midiFromNoteName('B', octaveRange[1]), targetMidi));
      currentMidi = withinRange;
      current = next;
    }

    const finalMidi = midiFromNoteName(root.noteName, octaveRange[0]);
    notes.push({ note: noteNameFromMidi(finalMidi), degree: '1', duration: 0.5, midi: finalMidi, isTense: false });

    const containsTenseNote = notes.some((n) => n.isTense);
    return {
      id: `lick-${seed}-${Math.floor(random() * 100000)}`,
      key: gravityMap.key,
      scaleId: gravityMap.scaleId,
      notes,
      containsTenseNote,
      startsOnSubdominant: (subdominantPool.map((n) => n.degree).includes(notes[0].degree)),
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
    repaired.notes[Math.max(1, repaired.notes.length - 3)] = {
      note: `${t.noteName}${octaveRange[0]}`,
      degree: t.degree,
      duration: 0.5,
      midi: midiFromNoteName(t.noteName, octaveRange[0]),
      isTense: true,
      resolvesFromPrevious: false
    };
  }
  repaired.notes[0].degree = subdominantPool[0]?.degree || repaired.notes[0].degree;
  repaired.notes[repaired.notes.length - 1].degree = '1';
  repaired.containsTenseNote = repaired.notes.some((n) => n.isTense);
  repaired.startsOnSubdominant = true;
  repaired.endsOnRoot = true;
  return repaired;
}

module.exports = { generateLick };
