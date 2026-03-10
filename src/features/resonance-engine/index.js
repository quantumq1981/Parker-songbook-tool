const { buildGravityMap } = require('./core/gravityEngine');
const { generateLick } = require('./core/lickGenerator');
const { mapLickToFretboard, mapGhostChordTonesToFretboard } = require('./core/fretboardMapper');
const { mapLickToPlaybackEvents } = require('./core/playbackMapper');

function runResonanceEngine(params) {
  const gravityMap = buildGravityMap(params.key, params.scale);
  const lick = generateLick({
    key: params.key,
    scale: params.scale,
    gravityMap,
    length: params.lickLength,
    seed: params.seed ?? 42
  });
  const ghostChordTones = mapGhostChordTonesToFretboard(gravityMap);
  const activePath = mapLickToFretboard(lick);
  const pulseMap = gravityMap.notes.map((n) => ({
    noteName: n.noteName,
    degree: n.degree,
    stability: n.stability,
    pulseMs: n.pulseMs,
    intensity: n.stability === 'stable' ? 0.35 : n.stability === 'moderate' ? 0.55 : n.stability === 'tense' ? 0.8 : 1
  }));
  const playbackEvents = mapLickToPlaybackEvents(lick);

  return {
    gravityMap,
    lick,
    ghostChordTones,
    activePath,
    pulseMap,
    playbackEvents,
    showArrows: Boolean(params.showArrows)
  };
}

module.exports = {
  runResonanceEngine,
  buildGravityMap,
  generateLick,
  mapLickToFretboard,
  mapLickToPlaybackEvents,
  mapGhostChordTonesToFretboard
};
