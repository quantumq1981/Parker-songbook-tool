(function (root) {
  'use strict';

  var MODES = {
    off:         function (n) { return new Array(n).fill(true); },
    alternate:   function (n) { return Array.from({length: n}, function (_, i) { return Math.floor(i / 2) % 2 === 0; }); },
    lastHalf:    function (n) { return Array.from({length: n}, function (_, i) { return i < n / 2; }); },
    random:      function (n, d) { return Array.from({length: n}, function () { return Math.random() > d; }); },
    progressive: function (n, _d, pass) {
      if (pass === undefined) pass = 0;
      var density = Math.min(0.75, pass * 0.1);
      return Array.from({length: n}, function () { return Math.random() > density; });
    }
  };

  function buildMask(barCount, mode, density, pass) {
    if (mode === undefined) mode = 'off';
    if (density === undefined) density = 0.4;
    if (pass === undefined) pass = 0;
    return (MODES[mode] || MODES.off)(barCount, density, pass);
  }

  root.SilentBars = { buildMask: buildMask, MODES: Object.keys(MODES) };
})(typeof globalThis !== 'undefined' ? globalThis : window);
