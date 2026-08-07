'use strict';

// S2 regression guard: every external CDN dependency must be pinned to an exact
// version and carry a Subresource Integrity (SRI) hash, and must be injected
// with crossorigin="anonymous" so the browser actually enforces that hash.
//
// The three libraries (AlphaTab, JSZip, SVGuitar) used to be static
// render-blocking <script> tags. They are now declared once in the
// `window.CDN_LIBS` manifest in <head> and fetched on demand by loadCdnLib().
// This test moves the same guard onto the manifest, and additionally asserts
// that no third-party <script src="https://…"> tag has crept back in — which
// would silently put the library back on the critical rendering path.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── 1. No static cross-origin <script> tags ────────────────────────────────
const scriptTagRe = /<script\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
const cdnScripts = [];
let m;
while ((m = scriptTagRe.exec(html)) !== null) {
  cdnScripts.push(m[1]);
}
assert.equal(
  cdnScripts.length,
  0,
  'third-party libraries must be demand-loaded via loadCdnLib(), not static ' +
    `<script src> tags; found: ${cdnScripts.join(', ')}`
);

// ── 2. Extract the CDN_LIBS manifest ───────────────────────────────────────
const manifestMatch = html.match(/window\.CDN_LIBS\s*=\s*(\{[\s\S]*?\n\};)/);
assert.ok(manifestMatch, 'window.CDN_LIBS manifest not found in index.html');

// The manifest is a plain object literal — evaluate it in isolation.
// eslint-disable-next-line no-new-func
const CDN_LIBS = new Function('return ' + manifestMatch[1].replace(/;$/, ''))();

const expected = [
  { name: 'AlphaTab', key: 'alphatab', src: '@coderline/alphatab@1.8.3/dist/alphaTab.min.js' },
  { name: 'JSZip', key: 'jszip', src: 'jszip@3.10.1/dist/jszip.min.js' },
  { name: 'SVGuitar', key: 'svguitar', src: 'svguitar@1.7.1/dist/svguitar.umd.js' }
];

// Exactly the three known dependencies. Adding a fourth forces a conscious
// update here too.
assert.equal(
  Object.keys(CDN_LIBS).length,
  expected.length,
  `expected ${expected.length} CDN libraries, found ${Object.keys(CDN_LIBS).length}: ` +
    Object.keys(CDN_LIBS).join(', ')
);

expected.forEach(({ name, key, src }) => {
  const entry = CDN_LIBS[key];
  assert.ok(entry, `${name}: expected a CDN_LIBS["${key}"] entry`);
  assert.ok(
    entry.url.includes(src),
    `${name}: url must point at ${src} (got ${entry.url})`
  );

  // Exact-pinned version.
  assert.ok(
    /@\d+\.\d+\.\d+|svguitar@\d+\.\d+\.\d+/.test(entry.url),
    `${name}: url must be pinned to an exact version (${entry.url})`
  );

  // SRI integrity hash, sha384, 64 base64 chars (= 48 decoded bytes).
  const integ = String(entry.integrity || '').match(/^sha384-([A-Za-z0-9+/]+=*)$/);
  assert.ok(integ, `${name}: missing or malformed sha384 integrity value`);
  assert.equal(
    Buffer.from(integ[1], 'base64').length,
    48,
    `${name}: integrity hash is not a valid 48-byte SHA-384`
  );

  // The global the loader waits on must be declared.
  assert.ok(
    typeof entry.global === 'string' && entry.global.length,
    `${name}: missing "global" property`
  );

  // A fallback, if declared, must be same-origin (SRI is not applied to it).
  if (entry.fallback) {
    assert.ok(
      /^\.?\//.test(entry.fallback),
      `${name}: fallback must be a same-origin relative path (${entry.fallback})`
    );
  }
});

// ── 3. No floating versions anywhere in the manifest ───────────────────────
Object.entries(CDN_LIBS).forEach(([key, { url }]) => {
  assert.ok(
    !/@latest|@\^|@~|@\*/.test(url),
    `floating version detected in CDN url for ${key}: ${url}`
  );
});

// ── 4. The loader must set crossorigin whenever it sets integrity ──────────
const loaderMatch = html.match(/if \(integrity\) \{([\s\S]*?)\}/);
assert.ok(loaderMatch, 'loadCdnLib(): integrity branch not found');
assert.ok(
  /s\.integrity\s*=\s*integrity/.test(loaderMatch[1]) &&
    /s\.crossOrigin\s*=\s*['"]anonymous['"]/.test(loaderMatch[1]),
  'loadCdnLib() must set both script.integrity and script.crossOrigin="anonymous"'
);

console.log('cdnSri tests passed');
