(function (root) {
  'use strict';

  function createMatcher(targetPcs, opts) {
    if (!opts) opts = {};
    var skipTolerance = opts.skipTolerance !== undefined ? opts.skipTolerance : 1;
    var cursor = 0, missed = 0;
    return {
      feed: function (pc) {
        if (cursor >= targetPcs.length) return 'complete';
        if (pc === targetPcs[cursor]) {
          return ++cursor >= targetPcs.length ? 'complete' : 'progress';
        }
        if (targetPcs[cursor + 1] === pc && missed < skipTolerance) {
          missed++;
          cursor += 2;
          return cursor >= targetPcs.length ? 'complete' : 'progress';
        }
        return 'ignore';
      },
      progress: function () { return targetPcs.length ? cursor / targetPcs.length : 0; },
      accuracy: function () { return targetPcs.length ? 1 - missed / targetPcs.length : 0; },
      reset: function () { cursor = 0; missed = 0; }
    };
  }

  root.CallResponse = { createMatcher: createMatcher };
})(typeof globalThis !== 'undefined' ? globalThis : window);
