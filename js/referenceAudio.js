/* referenceAudio.js — pure validation for user-uploaded reference audio.
 *
 * The DOM + IndexedDB wiring lives inline in index.html; this is the pure,
 * headless-testable slice: deciding whether a picked File is acceptable audio.
 * Kept separate so the accept/reject rules can be unit-tested without a browser.
 */
(function (root) {
  'use strict';

  // Some browsers report an empty MIME type for .mp3, so fall back to extension.
  var AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba|webm)$/i;
  var DEFAULT_MAX = 30 * 1024 * 1024; // 30 MB — comfortably fits a full head in IndexedDB.

  // Returns { ok: true } or { ok: false, reason }. `file` is a File-like object
  // ({ name, type, size }); maxBytes overrides the default cap.
  function isAcceptableAudio(file, maxBytes) {
    if (!file) return { ok: false, reason: 'No file selected.' };
    maxBytes = (typeof maxBytes === 'number' && maxBytes > 0) ? maxBytes : DEFAULT_MAX;
    var type = file.type || '';
    var name = file.name || '';
    var looksAudio = type.indexOf('audio/') === 0 || AUDIO_EXT.test(name);
    if (!looksAudio) return { ok: false, reason: 'That does not look like an audio file.' };
    if (typeof file.size === 'number' && file.size === 0) return { ok: false, reason: 'That file is empty.' };
    if (typeof file.size === 'number' && file.size > maxBytes) {
      return { ok: false, reason: 'That file is too large (max ' + Math.round(maxBytes / 1048576) + ' MB).' };
    }
    return { ok: true };
  }

  root.ReferenceAudio = {
    isAcceptableAudio: isAcceptableAudio,
    AUDIO_EXT: AUDIO_EXT,
    DEFAULT_MAX: DEFAULT_MAX
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
