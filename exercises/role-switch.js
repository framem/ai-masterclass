/**
 * Role Switch — per-slide "Dev / Non-Dev" toggle for the exercises.
 *
 * Goal: let the presenter flip the *audience framing* of an exercise live,
 * WITHOUT changing any behaviour, scoring or correct answers.
 *
 * How it works
 * ------------
 * 1. Any <section> that contains an exercise (a [data-quiz], a .mcq-grid, or
 *    an explicit [data-roleswitch] marker) gets a small segmented pill in the
 *    top-right corner: [ Dev | Non-Dev ].
 * 2. The persona is GLOBAL and persisted (localStorage key 'amc-persona').
 *    It can be pre-set on the start page (Vorbereitung section); every exercise
 *    page initialises from it. Flipping the toggle on any slide updates the
 *    global persona — all exercise slides on the page follow, and other
 *    pages pick it up on load (and live, via the 'storage' event).
 * 3. Static (HTML) exercises: tag any element whose wording should change with
 *        data-nd="…alternative HTML for the Non-Dev audience…"
 *    The element's original markup is the Dev version. On switch we swap
 *    innerHTML between the two. Elements WITHOUT data-nd are audience-neutral
 *    and stay identical in both modes — only code/jargon needs a variant.
 * 4. JS-driven exercises (exercises/*.js): listen for the 'rolechange' event
 *    dispatched on their <section> and re-render from their own dev/nondev data.
 *        section.addEventListener('rolechange', e => { role = e.detail.role; render(); });
 *    The current role is also readable any time via  section.dataset.role.
 * 5. Switching resets the visible quiz state on that slide (clears answered /
 *    picked markers, score back to 0, closes reveal panels) so the shown
 *    feedback always matches the active framing.
 */
(function () {
  'use strict';

  var DEFAULT_ROLE = 'dev';
  var STORAGE_KEY = 'amc-persona';

  function storedRole() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return (v === 'dev' || v === 'nondev') ? v : null;
    } catch (e) { return null; }
  }

  function persistRole(role) {
    try { localStorage.setItem(STORAGE_KEY, role); } catch (e) {}
  }

  var LABELS = {
    dev: 'Dev',
    nondev: 'Fachbereich'
  };

  // ---- one-time CSS ----
  function injectCss() {
    if (document.getElementById('role-switch-css')) return;
    var s = document.createElement('style');
    s.id = 'role-switch-css';
    s.textContent = [
      // Lives inline in the slide topbar's right-hand <span> (no longer an
      // absolutely-positioned corner chip). The host span flexes so the toggle
      // sits cleanly next to any remaining text (e.g. a page counter).
      '.topbar > span:has(> .role-toggle){',
      '  display:inline-flex; align-items:center; gap:18px;',
      '}',
      '.role-toggle{',
      '  display:inline-flex; align-items:center; gap:14px;',
      // The pill is taller than the topbar's text line. Cancel the extra height
      // with negative vertical margins so topbars WITH a persona switch keep
      // exactly the same height/padding as topbars without one.
      '  margin-top:-10px; margin-bottom:-10px;',
      '  font-family:var(--mono, "JetBrains Mono", monospace);',
      '  user-select:none;',
      '}',
      // Label sits OUTSIDE the pill — plain text, so it cannot be mistaken
      // for a third option in the button group.
      '.role-toggle .rt-lbl{',
      '  font-size:15px; letter-spacing:0.14em; text-transform:uppercase;',
      '  color:var(--ink-3, #6b6357);',
      '}',
      '.role-toggle .rt-pill{',
      '  display:inline-flex; align-items:stretch;',
      '  background:var(--paper, #faf7f1);',
      '  border:1px solid var(--ink, #15110c);',
      '  border-radius:999px; overflow:hidden;',
      '  box-shadow:0 2px 0 rgba(21,17,12,0.16);',
      '}',
      '.role-toggle button{',
      '  appearance:none; border:0; cursor:pointer; background:transparent;',
      '  font-family:inherit; font-size:17px; font-weight:600;',
      '  letter-spacing:0.06em; color:var(--ink-2, #3a342a);',
      '  padding:9px 20px; transition:background .15s ease, color .15s ease;',
      '}',
      '.role-toggle button:hover{ background:var(--bg-2, #ebe6db); }',
      '.role-toggle button[aria-pressed="true"]{',
      '  background:var(--accent, #c8421f); color:#fff;',
      '}',
      // subtle flash on the swapped content so the audience notices the change
      '@keyframes rs-flash{ 0%{ background:var(--accent-pale, #f6dccf);} 100%{ background:transparent; } }',
      '[data-nd].rs-changed{ animation:rs-flash .5s ease; border-radius:4px; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildToggle(section) {
    var current = section.dataset.role || DEFAULT_ROLE;
    var accent = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '').trim() || '#c8421f';

    var wrap = document.createElement('div');
    wrap.className = 'role-toggle';
    wrap.setAttribute('contenteditable', 'false');

    var lbl = document.createElement('span');
    lbl.className = 'rt-lbl';
    lbl.textContent = 'Persona';
    wrap.appendChild(lbl);

    var pill = document.createElement('div');
    pill.className = 'rt-pill';
    wrap.appendChild(pill);

    ['dev', 'nondev'].forEach(function (role) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.role = role;
      b.textContent = LABELS[role];
      // Bake the active state into the fresh node. We REBUILD this toggle on
      // every switch (see setRole) rather than mutate it, because mutating an
      // existing slotted descendant inside deck-stage's transform-scaled shadow
      // stage does not reliably repaint its background; a freshly inserted node
      // paints correctly.
      var active = (role === current);
      b.setAttribute('aria-pressed', String(active));
      if (active) { b.style.background = accent; b.style.color = '#fff'; }
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        setRole(section, role);
      });
      pill.appendChild(b);
    });
    return wrap;
  }

  // The toggle lives inside the slide's topbar, in its right-hand <span>.
  // Returns that span (creating one if the topbar somehow lacks it).
  function toggleHost(section) {
    var tb = section.querySelector('.topbar');
    if (!tb) return section;
    var spans = tb.querySelectorAll(':scope > span');
    var host = spans.length ? spans[spans.length - 1] : null;
    if (!host) { host = document.createElement('span'); tb.appendChild(host); }
    return host;
  }

  function mountToggle(section) {
    var host = toggleHost(section);
    // place the control first, ahead of any remaining text (e.g. a counter)
    host.insertBefore(buildToggle(section), host.firstChild);
  }

  // Replace the toggle with a freshly-built one carrying the active state.
  function rebuildToggle(section) {
    var old = section.querySelector('.role-toggle');
    var fresh = buildToggle(section);
    if (old && old.parentNode) old.parentNode.replaceChild(fresh, old);
    else mountToggle(section);
  }

  function applyContent(section, role, flash) {
    section.querySelectorAll('[data-nd]').forEach(function (el) {
      if (el._devHTML === undefined) el._devHTML = el.innerHTML;
      var next = (role === 'nondev') ? el.getAttribute('data-nd') : el._devHTML;
      if (el.innerHTML !== next) {
        el.innerHTML = next;
        el.classList.remove('rs-changed');
        if (flash !== false) {
          // restart the flash animation
          void el.offsetWidth;
          el.classList.add('rs-changed');
        }
      }
    });
  }

  // Reset the visible quiz state so feedback matches the active framing.
  function resetExercise(section) {
    section.querySelectorAll('.qitem').forEach(function (item) {
      item.classList.remove('answered');
      item.querySelectorAll('.qchoice').forEach(function (b) {
        b.classList.remove('picked-ok', 'picked-no', 'show-ok');
      });
    });
    section.querySelectorAll('.mcq-grid').forEach(function (grid) {
      grid.classList.remove('answered');
      grid.querySelectorAll('.mcq').forEach(function (c) {
        c.classList.remove('picked-ok', 'picked-no', 'show-ok');
      });
    });
    var statusEl = section.querySelector('.reveal-status .score');
    if (statusEl) statusEl.textContent = '0';
    section.querySelectorAll('[data-explain]').forEach(function (ex) {
      ex.classList.remove('open');
    });
  }

  // Apply a role to ONE section (content swap, quiz reset, toggle rebuild).
  function applySection(section, role, flash) {
    if ((section.dataset.role || DEFAULT_ROLE) === role) return;
    section.dataset.role = role;
    applyContent(section, role, flash);
    resetExercise(section);
    rebuildToggle(section);
    section.dispatchEvent(new CustomEvent('rolechange', {
      detail: { role: role },
      bubbles: false
    }));
  }

  function exerciseSections() {
    var out = [];
    document.querySelectorAll('deck-stage > section, body > section').forEach(function (s) {
      if (isExerciseSection(s)) out.push(s);
    });
    return out;
  }

  // The persona is global: flipping it anywhere persists it and updates
  // every exercise slide on the page. Other open pages sync via 'storage'.
  function setRole(section, role) {
    persistRole(role);
    exerciseSections().forEach(function (s) {
      applySection(s, role, s === section);
    });
  }

  function isExerciseSection(section) {
    return !!(section.querySelector('[data-quiz]') ||
              section.querySelector('.quiz') ||
              section.querySelector('.mcq-grid') ||
              section.hasAttribute('data-roleswitch'));
  }

  function init() {
    injectCss();
    var globalRole = storedRole() || DEFAULT_ROLE;
    var sections = document.querySelectorAll('deck-stage > section, body > section');
    sections.forEach(function (section) {
      if (!isExerciseSection(section)) return;
      // The markup as authored is always the Dev variant — start from that
      // clean base, regardless of any serialized data-role attribute.
      section.dataset.role = DEFAULT_ROLE;
      // A toggle may have been serialized into the saved HTML by the editor.
      // Such a node has NO event listeners — clicking it does nothing. Always
      // discard any pre-existing toggle and mount a freshly wired one.
      section.querySelectorAll('.role-toggle').forEach(function (t) {
        if (t.parentNode) t.parentNode.removeChild(t);
      });
      mountToggle(section);
      // Then apply the globally chosen persona (start page or previous slide).
      if (globalRole !== DEFAULT_ROLE) applySection(section, globalRole, false);
    });
  }

  // Live-sync when the persona is changed on another open page (e.g. the
  // start page in a second tab).
  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY) return;
    var role = (e.newValue === 'nondev') ? 'nondev' : DEFAULT_ROLE;
    exerciseSections().forEach(function (s) { applySection(s, role, false); });
  });

  // expose for JS exercises that want to read/set programmatically
  window.RoleSwitch = { setRole: setRole, DEFAULT_ROLE: DEFAULT_ROLE, STORAGE_KEY: STORAGE_KEY };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
