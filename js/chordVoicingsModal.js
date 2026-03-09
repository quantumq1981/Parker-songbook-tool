(function (global) {
  let modal, backdrop, body, titleEl, closeBtn, toggleEl, countEl;
  let lastTrigger = null;
  let state = { symbol: '', positions: [] };

  function ensureModal() {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'chordVoicingsModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'chordVoicingsTitle');
    modal.hidden = true;
    modal.innerHTML = `
      <div id="chordVoicingsBackdrop"></div>
      <div class="chord-voicings-panel" tabindex="-1">
        <div class="chord-voicings-head">
          <h3 id="chordVoicingsTitle">Chord Voicings</h3>
          <div class="chord-voicings-controls">
            <label><input type="checkbox" id="jazzVoicingsToggle" checked/> Show jazz voicings only</label>
            <span id="chordVoicingsCount"></span>
            <button type="button" id="chordVoicingsClose" aria-label="Close chord voicings">✕</button>
          </div>
        </div>
        <div id="chordVoicingsBody"></div>
      </div>`;
    document.body.appendChild(modal);
    backdrop = modal.querySelector('#chordVoicingsBackdrop');
    body = modal.querySelector('#chordVoicingsBody');
    titleEl = modal.querySelector('#chordVoicingsTitle');
    closeBtn = modal.querySelector('#chordVoicingsClose');
    toggleEl = modal.querySelector('#jazzVoicingsToggle');
    countEl = modal.querySelector('#chordVoicingsCount');

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    toggleEl.addEventListener('change', rerender);
    modal.addEventListener('keydown', trapFocus);
  }

  function trapFocus(e) {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    const focusables = modal.querySelectorAll('button,[href],input,[tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function rerender() {
    const filtered = toggleEl.checked
      ? global.ChordDataService.filterJazzVoicings(state.positions)
      : state.positions;
    body.innerHTML = '';
    if (!filtered.length) {
      body.innerHTML = `<div class="chord-voicings-empty">No voicings found for ${state.symbol}.</div>`;
      countEl.textContent = '0 voicings';
      return;
    }
    countEl.textContent = `${filtered.length} voicings`;
    filtered.forEach((position, idx) => {
      const tile = document.createElement('div');
      body.appendChild(tile);
      global.ChordDiagram.renderChordDiagram(tile, { title: `${state.symbol} #${idx + 1}`, position });
    });
  }

  function open({ symbol, positions, message, trigger }) {
    ensureModal();
    lastTrigger = trigger || document.activeElement;
    state = { symbol, positions: positions || [] };
    titleEl.textContent = symbol || 'Chord Voicings';
    body.innerHTML = '';
    if (message) {
      body.innerHTML = `<div class="chord-voicings-empty">${message}</div>`;
      countEl.textContent = '0 voicings';
    } else {
      rerender();
    }
    modal.hidden = false;
    document.body.classList.add('modal-open');
    closeBtn.focus();
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  }

  const api = { open, close, ensureModal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChordVoicingsModal = api;
})(typeof window !== 'undefined' ? window : globalThis);
