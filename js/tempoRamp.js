(function (root) {
  'use strict';

  function createRamp(cfg) {
    var bpm = cfg.start, passes = 0, stalls = 0;
    return {
      current: function () { return bpm; },
      pass: function (clean) {
        if (clean === undefined) clean = true;
        if (!clean) {
          bpm = Math.max(cfg.start, bpm - cfg.step);
          passes = 0;
          stalls++;
          return { bpm: bpm, event: 'backoff', stalls: stalls };
        }
        if (++passes < cfg.passesPerStep) return { bpm: bpm, event: 'hold', passes: passes };
        passes = 0;
        if (bpm >= cfg.target) return { bpm: bpm, event: 'target' };
        bpm = Math.min(cfg.target, bpm + cfg.step);
        return { bpm: bpm, event: 'advance' };
      },
      reset: function () { bpm = cfg.start; passes = 0; stalls = 0; }
    };
  }

  root.TempoRamp = { createRamp: createRamp };
})(typeof globalThis !== 'undefined' ? globalThis : window);
