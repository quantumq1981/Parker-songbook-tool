'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('  function switchView(view) {');
const end = html.indexOf('  // Expose the view switcher', start);
assert(start >= 0 && end > start, 'view controller must exist');

function element() {
  const classes = new Set();
  const attributes = {};
  return {
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }
    },
    setAttribute(name, value) { attributes[name] = value; },
    getAttribute: name => attributes[name]
  };
}

const sheet = element();
const notation = element();
notation.classList.add('is-disarmed');
const tabs = ['grid', 'notation', 'tab'].map(view => Object.assign(element(), { dataset: { view } }));
const elements = { sheet, 'alphatab-container': notation, tuneSel: { value: '' }, keySel: { value: '' } };
let events = 0;
const document = {
  getElementById: id => elements[id],
  querySelectorAll: () => tabs,
  dispatchEvent: () => { events++; }
};
const storage = new Map();
const localStorage = {
  getItem: key => storage.get(key),
  setItem: (key, value) => storage.set(key, value)
};
const context = { document, localStorage, Event: class {}, api: null, atScore: null,
  loadNotation: () => { throw Error('No tune selected'); }, currentView: 'grid' };
vm.createContext(context);
vm.runInContext(html.slice(start, end), context);

context.switchView('notation');
assert(sheet.classList.contains('is-disarmed'));
assert(!notation.classList.contains('is-disarmed'));
assert(notation.classList.contains('is-armed'));
assert.deepStrictEqual(tabs.map(tab => tab.getAttribute('aria-selected')), ['false', 'true', 'false']);
context.switchView('grid');
assert(!sheet.classList.contains('is-disarmed'));
assert(notation.classList.contains('is-disarmed'));
assert.deepStrictEqual(tabs.map(tab => tab.getAttribute('aria-selected')), ['true', 'false', 'false']);
context.switchView('invalid');
assert.strictEqual(events, 2, 'invalid views must not change navigation state');
assert.strictEqual(JSON.parse(storage.get('cp_songbook_v7_prefs')).notationView, 'grid');

// CSS mode gating: arming alone cannot reveal a panel in another workflow.
assert(!/\[data-modes\]\.is-armed\s*\{\s*display\s*:/.test(html));
assert(/id="alphatab-container"[^>]*data-modes="learn practice"/.test(html));
assert(/body\[data-active-mode="learn"\] \.sheet-view-header/.test(html));
assert(!/body\[data-active-mode\] \.sheet-view-header\[data-modes\]\s*\{/.test(html));

// Learn's Notation/Tab panel must use the notation player, not hidden grid audio.
const playStart = html.indexOf('  function routePlay() {');
const playEnd = html.indexOf('  function routeStop() {', playStart);
assert(playStart >= 0 && playEnd > playStart);
let mode = 'learn', view = 'notation';
const played = [];
const buttons = Object.fromEntries(['playBtn', 'atMainPlayBtn', 'headPlayBtn', 'resonancePlayBtn']
  .map(id => [id, { click: () => played.push(id) }]));
const router = {
  currentMode: () => mode,
  activeSheetView: () => view,
  document: { getElementById: id => buttons[id] }
};
vm.createContext(router);
vm.runInContext(html.slice(playStart, playEnd), router);
router.routePlay();
view = 'grid'; router.routePlay();
mode = 'practice'; router.routePlay();
view = 'tab'; router.routePlay();
assert.deepStrictEqual(played, ['atMainPlayBtn', 'playBtn', 'headPlayBtn', 'atMainPlayBtn']);

console.log('navigation state and mode gate tests passed');
