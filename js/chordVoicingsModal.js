(function (global) {
  let modal, backdrop, body, titleEl, closeBtn, toggleEl, countEl;
  let lastTrigger = null;
  // state.chords: [{ symbol, key, suffix, voicings:[canonical], subs:[], message? }]
  let state = { title: '', chords: [] };

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
            <label class="cv-toggle"><input type="checkbox" id="jazzVoicingsToggle" checked/> Compact grips first</label>
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
    // Delegate substitution clicks: drill into the sub's own voicings.
    body.addEventListener('click', (e) => {
      const chip = e.target.closest('.cv-sub');
      if (!chip || !chip.dataset.symbol) return;
      if (typeof global.openChordVoicingsForSymbol === 'function') {
        global.openChordVoicingsForSymbol(chip.dataset.symbol, lastTrigger);
      }
    });
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

  function escapeHtml(str) {
    return `${str == null ? '' : str}`.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function orderVoicings(voicings) {
    if (!Array.isArray(voicings)) return [];
    if (toggleEl.checked && global.ChordDataService?.filterJazzVoicings) {
      return global.ChordDataService.filterJazzVoicings(voicings);
    }
    return voicings;
  }

  function renderSubs(subs) {
    if (!Array.isArray(subs) || !subs.length) return '';
    const chips = subs.map((s) => `
      <button type="button" class="cv-sub" data-symbol="${escapeHtml(s.symbol)}"
              title="View voicings for ${escapeHtml(s.symbol)}">
        <span class="cv-sub-top">
          <span class="cv-sub-symbol">${escapeHtml(s.symbol)}</span>
          <span class="cv-sub-cat">${escapeHtml(s.category)}</span>
        </span>
        <span class="cv-sub-reason">${escapeHtml(s.reason)}</span>
      </button>`).join('');
    return `
      <div class="cv-subs">
        <div class="cv-subs-head">Substitutions &amp; reharmonization <span class="cv-subs-hint">tap to explore</span></div>
        <div class="cv-subs-list">${chips}</div>
      </div>`;
  }

  function rerender() {
    body.innerHTML = '';
    let total = 0;
    const renderTasks = [];

    state.chords.forEach((chord, chordIdx) => {
      const section = document.createElement('section');
      section.className = 'cv-chord';

      const head = document.createElement('div');
      head.className = 'cv-chord-head';
      head.innerHTML = `<h4 class="cv-chord-name">${escapeHtml(chord.symbol)}</h4>
        <span class="cv-chord-tag">voicings</span>`;
      section.appendChild(head);

      const ordered = orderVoicings(chord.voicings);
      total += ordered.length;

      if (!ordered.length) {
        const empty = document.createElement('div');
        empty.className = 'chord-voicings-empty';
        empty.textContent = chord.message || `No voicings found for ${chord.symbol}.`;
        section.appendChild(empty);
      } else {
        const grid = document.createElement('div');
        grid.className = 'cv-voicings';
        section.appendChild(grid);
        ordered.forEach((position, idx) => {
          const tile = document.createElement('div');
          tile.dataset.voicingIndex = String(idx);
          tile.id = `cv-${chordIdx}-${idx}`;
          grid.appendChild(tile);
          const title = position && position.name
            ? position.name
            : `${chord.symbol} #${idx + 1}`;
          renderTasks.push(global.ChordDiagram.renderChordDiagram(tile, { title, position, index: idx }));
        });
      }

      const subsHtml = renderSubs(chord.subs);
      if (subsHtml) {
        const wrap = document.createElement('div');
        wrap.innerHTML = subsHtml;
        section.appendChild(wrap.firstElementChild);
      }

      body.appendChild(section);
    });

    countEl.textContent = `${total} voicing${total === 1 ? '' : 's'}`;

    Promise.allSettled(renderTasks).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length) console.error('[ChordVoicingsModal] Some diagrams failed to render.', failed);
    });
  }

  /**
   * @param {object} payload
   * @param {string} payload.title   headline, e.g. "Bbm7 / Eb7"
   * @param {Array}  payload.chords  [{ symbol, key, suffix, voicings, subs, message? }]
   * @param {string} [payload.message] global message (nothing to show)
   * @param {Element} [payload.trigger]
   */
  function open(payload) {
    ensureModal();
    lastTrigger = payload.trigger || document.activeElement;
    state = { title: payload.title || '', chords: payload.chords || [] };
    titleEl.textContent = state.title || 'Chord Voicings';
    body.innerHTML = '';
    modal.hidden = false;
    document.body.classList.add('modal-open');

    if (payload.message) {
      body.innerHTML = `<div class="chord-voicings-empty">${escapeHtml(payload.message)}</div>`;
      countEl.textContent = '0 voicings';
    } else {
      requestAnimationFrame(rerender);
    }
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
