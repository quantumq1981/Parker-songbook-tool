'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function buildScaleLibrary() {');
const end = html.indexOf('/* ============================================================\n   LEAD SHEET RENDERER', start);
assert(start >= 0 && end > start, 'scale library builder must exist');

const items = [];
function node(tagName) {
  const classes = new Set();
  return {
    tagName,
    children: [],
    attributes: {},
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name)
    },
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, fn) { this[name] = fn; }
  };
}
const grid = node('div');
const fretboard = node('div');
fretboard.scrollIntoView = () => {};
const calls = [];
const document = {
  getElementById: id => id === 'libGrid' ? grid : fretboard,
  createElement: tag => {
    const el = node(tag);
    if (tag === 'button') items.push(el);
    return el;
  },
  querySelectorAll: () => items.filter(el => el.classList.contains('lib-active'))
};
const context = {
  document,
  SCALE_LIBRARY: { Bebop: [
    { name: 'Major Bebop', notes: ['C', 'D'], root: 'C' },
    { name: 'Dorian', notes: ['C', 'Eb'], root: 'C' }
  ] },
  NOTE_IDX: { C: 0, D: 2, Eb: 3 },
  intervalDegree: n => String(n),
  showLibraryScale: (...args) => calls.push(['show', ...args]),
  playLibraryScale: (...args) => calls.push(['play', ...args]),
  buildFretboard: () => { throw Error('Selecting a scale must reuse the existing SVG'); }
};
vm.createContext(context);
vm.runInContext(html.slice(start, end), context);
context.buildScaleLibrary();
assert.strictEqual(items.length, 2);
assert(items.every(el => el.type === 'button' && el.attributes['aria-pressed'] === 'false'));
items[0].click();
assert.strictEqual(items[0].attributes['aria-pressed'], 'true');
assert.strictEqual(calls[0][1], 'Major Bebop');
items[1].click();
assert.strictEqual(items[0].attributes['aria-pressed'], 'false');
assert.strictEqual(items[1].attributes['aria-pressed'], 'true');
assert.strictEqual(calls[2][1], 'Dorian');

// Stand mode must retain access to the library, while hiding other details.
assert(/body\.stand-mode details:not\(\.scale-lib\)/.test(html));
assert(/id="openScaleLibraryBtn"[\s\S]*?data-modes="improvise"/.test(html));
assert(/panel\.open = true;[\s\S]*?panel\.scrollIntoView/.test(html));

console.log('scale library navigation and selection tests passed');
