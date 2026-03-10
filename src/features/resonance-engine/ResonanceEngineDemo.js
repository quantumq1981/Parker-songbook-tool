const { runResonanceEngine } = require('./index');
const { DEMO_SCALES } = require('./demoData');

function renderResonanceEngineDemo(target, key = 'C', scaleId = 'ionian') {
  const scale = DEMO_SCALES[scaleId];
  const output = runResonanceEngine({ key, scale, showArrows: true });
  target.innerHTML = [
    `<h3>Universal Resonance Engine Demo</h3>`,
    `<p><strong>Key:</strong> ${key} | <strong>Scale:</strong> ${scale.name}</p>`,
    `<p><strong>Lick:</strong> ${output.lick.notes.map((n) => n.note).join(' - ')}</p>`,
    `<p><strong>Ghost tones:</strong> ${output.ghostChordTones.length}</p>`,
    `<p><strong>Gravity arrows:</strong> ${output.gravityMap.arrows.length}</p>`
  ].join('');
  return output;
}

module.exports = { renderResonanceEngineDemo };
