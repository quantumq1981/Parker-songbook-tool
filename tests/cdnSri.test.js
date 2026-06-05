'use strict';

// S2 regression guard: every external CDN <script> in index.html must be
// pinned to an exact version and carry a Subresource Integrity (SRI) hash plus
// crossorigin="anonymous". This locks in the AlphaTab/JSZip/SVGuitar hardening
// so a future edit can't silently drop the integrity attribute or float the
// version back to a range / @latest.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Match every <script ... src="http(s)://..."> ... </script> opening tag.
const scriptTagRe = /<script\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi;

const cdnScripts = [];
let m;
while ((m = scriptTagRe.exec(html)) !== null) {
  cdnScripts.push({ tag: m[0], src: m[1] });
}

// We expect exactly the three known CDN dependencies. If a new one is added,
// this count assertion forces a conscious update here too.
assert.equal(
  cdnScripts.length,
  3,
  `expected 3 CDN <script> tags, found ${cdnScripts.length}: ` +
    cdnScripts.map((s) => s.src).join(', ')
);

const expected = [
  { name: 'AlphaTab', src: '@coderline/alphatab@1.8.3/dist/alphaTab.min.js' },
  { name: 'JSZip', src: 'jszip@3.10.1/dist/jszip.min.js' },
  { name: 'SVGuitar', src: 'svguitar@1.7.1/dist/svguitar.umd.js' }
];

expected.forEach(({ name, src }) => {
  const entry = cdnScripts.find((s) => s.src.includes(src));
  assert.ok(entry, `${name}: expected a CDN <script> for ${src}`);

  // Exact-pinned version (the @x.y.z appears in the matched src above).
  assert.ok(
    /@\d+\.\d+\.\d+|svguitar@\d+\.\d+\.\d+/.test(entry.src),
    `${name}: src must be pinned to an exact version (${entry.src})`
  );

  // SRI integrity hash, sha384, 64 base64 chars (= 48 decoded bytes).
  const integ = entry.tag.match(/\bintegrity=["']sha384-([A-Za-z0-9+/]+=*)["']/);
  assert.ok(integ, `${name}: missing sha384 integrity attribute`);
  assert.equal(
    Buffer.from(integ[1], 'base64').length,
    48,
    `${name}: integrity hash is not a valid 48-byte SHA-384`
  );

  // crossorigin="anonymous" is required for SRI to be enforced cross-origin.
  assert.ok(
    /\bcrossorigin=["']anonymous["']/.test(entry.tag),
    `${name}: missing crossorigin="anonymous"`
  );
});

// No floating versions anywhere in CDN script srcs.
cdnScripts.forEach(({ src }) => {
  assert.ok(
    !/@latest|@\^|@~|@\*/.test(src),
    `floating version detected in CDN src: ${src}`
  );
});

console.log('cdnSri tests passed');
