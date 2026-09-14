(function (global) {
  let modal, backdrop, body, titleEl, closeBtn, countEl, labelModeEl;
  let lastTrigger = null;
  let labelMode = 'finger'; // 'finger' (finger numbers) | 'interval' (R/3/5/b7)
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
            <div class="cv-labelmode" role="group" aria-label="Dot labels">
              <button type="button" class="cv-seg active" data-mode="finger" aria-pressed="true">Fingers</button>
              <button type="button" class="cv-seg" data-mode="interval" aria-pressed="false">Intervals</button>
            </div>
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
    labelModeEl = modal.querySelector('.cv-labelmode');
    countEl = modal.querySelector('#chordVoicingsCount');

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    labelModeEl.addEventListener('click', (e) => {
      const seg = e.target.closest('.cv-seg');
      if (!seg || seg.dataset.mode === labelMode) return;
      labelMode = seg.dataset.mode;
      labelModeEl.querySelectorAll('.cv-seg').forEach((b) => {
        const on = b.dataset.mode === labelMode;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      rerender();
    });
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
    // VoicingLibrary already returns them in neck-position order (open/low
    // shapes first), matching a standard chord dictionary.
    return Array.isArray(voicings) ? voicings : [];
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

  const GROUP_ORDER = ['Library', 'Drop 2', 'Drop 3'];
  const GROUP_BLURB = {
    Library: 'Common dictionary shapes across the neck.',
    'Drop 2': 'Four-note voicings — 2nd voice from the top dropped an octave (adjacent strings).',
    'Drop 3': 'Four-note voicings — 3rd voice from the top dropped an octave (one string skipped).'
  };

  function groupVoicings(voicings) {
    const groups = new Map();
    (voicings || []).forEach((v) => {
      const g = (v && v.group) || 'Library';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(v);
    });
    return [...groups.keys()]
      .sort((a, b) => {
        const ia = GROUP_ORDER.indexOf(a);
        const ib = GROUP_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })
      .map((g) => ({ group: g, items: groups.get(g) }));
  }

  function fretLabelFor(v) {
    const base = (v && v.baseFret) || 1;
    return base <= 1 ? 'open' : `${base}fr`;
  }

  function tileTitle(chord, v, idx) {
    if (!v || !v.name) return `${chord.symbol} #${idx + 1}`;
    // Group header already names the drop type; drop the redundant prefix.
    return v.name.replace(/^Drop \d+ · /, '');
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
        groupVoicings(ordered).forEach((grp) => {
          const gh = document.createElement('div');
          gh.className = 'cv-group-head';
          gh.innerHTML = `<span class="cv-group-name">${escapeHtml(grp.group)}</span>
            <span class="cv-group-blurb">${escapeHtml(GROUP_BLURB[grp.group] || '')}</span>`;
          section.appendChild(gh);

          const grid = document.createElement('div');
          grid.className = 'cv-voicings';
          section.appendChild(grid);

          grp.items.forEach((position, idx) => {
            const tile = document.createElement('div');
            tile.id = `cv-${chordIdx}-${grp.group.replace(/\s+/g, '')}-${idx}`;
            grid.appendChild(tile);
            renderTasks.push(global.ChordDiagram.renderChordDiagram(tile, {
              title: tileTitle(chord, position, idx),
              fretLabel: fretLabelFor(position),
              position,
              index: idx,
              labelMode
            }));
          });
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
