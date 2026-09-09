const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function loadModule(filename) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', filename), 'utf8');
  const ctx = { globalThis: {}, window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.globalThis;
}

const { ReferenceAudio } = loadModule('referenceAudio.js');

// accepts a normal mp3 by MIME type
assert.strictEqual(ReferenceAudio.isAcceptableAudio({ name: 'bird.mp3', type: 'audio/mpeg', size: 4_000_000 }).ok, true);

// accepts by extension even when the browser reports an empty MIME type
assert.strictEqual(ReferenceAudio.isAcceptableAudio({ name: 'KoKo.MP3', type: '', size: 3_000_000 }).ok, true);

// accepts other common audio types
assert.strictEqual(ReferenceAudio.isAcceptableAudio({ name: 'x.m4a', type: 'audio/mp4', size: 1000 }).ok, true);

// rejects a non-audio file
{
  const r = ReferenceAudio.isAcceptableAudio({ name: 'notes.pdf', type: 'application/pdf', size: 1000 });
  assert.strictEqual(r.ok, false);
  assert.ok(/audio/i.test(r.reason));
}

// rejects an empty file
{
  const r = ReferenceAudio.isAcceptableAudio({ name: 'empty.mp3', type: 'audio/mpeg', size: 0 });
  assert.strictEqual(r.ok, false);
  assert.ok(/empty/i.test(r.reason));
}

// rejects a file over the cap
{
  const r = ReferenceAudio.isAcceptableAudio({ name: 'huge.mp3', type: 'audio/mpeg', size: 40 * 1024 * 1024 });
  assert.strictEqual(r.ok, false);
  assert.ok(/large/i.test(r.reason));
}

// honours a custom cap
{
  const r = ReferenceAudio.isAcceptableAudio({ name: 'ok.mp3', type: 'audio/mpeg', size: 2_000_000 }, 1_000_000);
  assert.strictEqual(r.ok, false);
}

// rejects a missing file
assert.strictEqual(ReferenceAudio.isAcceptableAudio(null).ok, false);

console.log('referenceAudio tests passed');
