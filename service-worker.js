'use strict';

// Bump this string whenever the app shell changes to force cache refresh.
const CACHE = 'cp-songbook-v4';

// Core app shell — pre-cached at install so the page works offline from the
// very first load after the SW is installed.
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './js/chordDataService.js',
  './js/chordDiagram.js',
  './js/chordParser.js',
  './js/chordVoicingsInit.js',
  './js/chordVoicingsModal.js',
  './js/jazzChordDatabase.js',
  './js/resonanceEngine.js',
  './js/svguitar.umd.js',
  './js/pitch-processor.js',
];

// Pinned CDN asset URLs whose responses should be cached on first use.
// Locked to exact versioned URLs (matching the SRI-protected <script> tags in
// index.html) so the SW never caches an unpinned or unexpected CDN resource.
const CDN_ASSETS = new Set([
  'https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.3/dist/alphaTab.min.js',
  'https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.3/dist/soundfont/sonivox.sf2',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://unpkg.com/svguitar@1.7.1/dist/svguitar.umd.js',
]);

// ── Cache-first strategy ────────────────────────────────────────────────────
// Serve from cache immediately when available; populate cache on network hit.
// Appropriate for versioned assets and CDN resources that don't change often.
function cacheFirst(request) {
  return caches.open(CACHE).then(cache =>
    cache.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200 && response.type !== 'error') {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => {
        // Network failed and nothing in cache — return a minimal offline response
        // for navigation requests so the browser doesn't show a blank error page.
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      });
    })
  );
}

// ── Install: pre-cache the app shell ───────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())  // activate immediately without waiting for tab reload
  );
});

// ── Activate: evict caches from previous versions ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // take control of existing tabs immediately
  );
});

// ── Fetch: route requests through the cache ────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Same-origin requests (index.html, /js/, /docs/ GP files, /icons/) → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pinned CDN requests (alphaTab, SoundFont, JSZip, SVGuitar) → cache-first.
  // Only the exact versioned URLs are cached; any other CDN path passes through.
  // These are fetched lazily on first use and cached for offline playback thereafter.
  if (CDN_ASSETS.has(url.href)) {
    event.respondWith(cacheFirst(request));
  }
  // All other cross-origin requests (e.g. GitHub API calls) pass through unchanged.
});
