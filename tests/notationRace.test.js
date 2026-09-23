'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function section(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert(a >= 0 && b > a, `Missing code section: ${start}`);
  return html.slice(a, b);
}
const flush = () => new Promise(resolve => setImmediate(resolve));

function deferredFetch() {
  const requests = [];
  function fetch(url, options) {
    return new Promise((resolve, reject) => {
      requests.push({ url, signal: options.signal,
        resolve: value => resolve({ ok: true, arrayBuffer: () => Promise.resolve(value), text: () => Promise.resolve(value) }),
        reject });
    });
  }
  return { requests, fetch };
}

function elements() {
  const nodes = new Map();
  const node = () => ({ textContent: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, contains() { return false; } } });
  return { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); },
    querySelectorAll() { return []; } };
}

(async () => {
  // Main notation: A resolves after B even if an abort arrives too late for
  // the network to honor it; only B may reach alphaTab.
  {
    const { fetch, requests } = deferredFetch();
    const loaded = [], toasts = [];
    const ctx = { fetch, AbortController, document: elements(), OMNIBOOK_BASE: '/docs/',
      api: { settings: { display: {} }, updateSettings() {}, load: value => loaded.push(value) },
      pendingLoad: null, atScore: null, loadedTuneName: '',
      findOmnibookTune: name => name === 'Missing' ? null : { name, file: name + '.gp' },
      getTuneOriginalKey: () => 'C', getSemitones: () => 0,
      showToast: message => toasts.push(message) };
    vm.createContext(ctx);
    vm.runInContext(section('  let notationRequest = 0;', '  // ── Speed helper',), ctx);
    vm.runInContext(section('  function _fetchAndLoad(', '  // ── Apply live transposition'), ctx);
    ctx.loadNotation('A', 'C');
    ctx.loadNotation('B', 'C');
    assert(requests[0].signal.aborted);
    requests[1].resolve('B-data');
    await flush();
    requests[0].resolve('A-data');
    await flush();
    assert.deepStrictEqual(loaded, ['B-data']);
    assert.strictEqual(ctx.loadedTuneName, 'B');
    ctx.loadNotation('A', 'C');
    ctx.loadNotation('B', 'C');
    ctx.loadNotation('A', 'C');
    requests[4].resolve('A-again');
    await flush();
    requests[3].resolve('stale-B');
    requests[2].resolve('stale-A');
    await flush();
    assert.deepStrictEqual(loaded, ['B-data', 'A-again'], 'rapid A→B→A leaves the final selection visible');
    assert.strictEqual(ctx.loadedTuneName, 'A');
    ctx.loadNotation('A', 'C');
    ctx.loadNotation('Missing', 'C');
    requests[5].reject(new Error('old network failure'));
    await flush();
    assert.deepStrictEqual(toasts, []);
    assert.strictEqual(ctx.document.getElementById('atMainEmpty').style.display, '');
  }

  // Heads: superseded failure cannot mark the newer button as failed, and a
  // downloaded score cannot replace a later imported/previewed selection.
  {
    const { fetch, requests } = deferredFetch();
    const loaded = [], toasts = [], doc = elements();
    const ctx = { fetch, AbortController, document: doc, OMNIBOOK_BASE: '/docs/',
      api: { stop() {}, load: value => loaded.push(value) }, hdSyncChart() {},
      atEnsure: () => true, hdClearFb() {}, currentBtn: null, currentTuneName: '',
      showToast: message => toasts.push(message) };
    vm.createContext(ctx);
    vm.runInContext(section('  let pendingHeadRetry = null;', '  function atEnsure('), ctx);
    vm.runInContext(section('  function hdFetch(tune, btn) {', '  // ── Tune grid'), ctx);
    const a = doc.getElementById('buttonA'), b = doc.getElementById('buttonB');
    ctx.hdFetch({ name: 'A', file: 'A.gp' }, a);
    ctx.hdFetch({ name: 'B', file: 'B.gp' }, b);
    assert(requests[0].signal.aborted);
    requests[0].reject(new Error('A failed late'));
    await flush();
    assert.deepStrictEqual(toasts, []);
    requests[1].resolve('B-data');
    await flush();
    assert.deepStrictEqual(loaded, ['B-data']);
    ctx.hdFetch({ name: 'A', file: 'A.gp' }, a);
    ctx.beginHeadLoad(); // e.g. an upload or lick preview replaces the head
    requests[2].resolve('A-data');
    await flush();
    assert.deepStrictEqual(loaded, ['B-data']);
  }

  // First open: the CDN can still be loading while several heads are tapped.
  // The one retry after it loads must represent the latest tap.
  {
    let finishDownload;
    const callbacks = [];
    const ctx = { api: null, document: elements(), window: {
      alphaTab: null,
      loadCdnLib: () => new Promise(resolve => { finishDownload = resolve; })
    }, console, atInit() {}, showToast() {} };
    vm.createContext(ctx);
    vm.runInContext('let atLibPending = false;', ctx);
    vm.runInContext(section('  let pendingHeadRetry = null;', '  function atEnsure('), ctx);
    vm.runInContext(section('  function atEnsure(retry) {', '  // ── Initialize alphaTab API'), ctx);
    ctx.atEnsure(() => callbacks.push('A'));
    ctx.atEnsure(() => callbacks.push('B'));
    finishDownload();
    await flush();
    assert.deepStrictEqual(callbacks, ['B']);
  }

  console.log('notation and Heads stale-request tests passed');
})().catch(err => { console.error(err); process.exitCode = 1; });
