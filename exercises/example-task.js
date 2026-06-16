/**
 * Beispielaufgabe — worked-example dialogue overlay for the hands-on
 * Praxis-Übungen.
 *
 * Markup (authored per slide, inside the <section>):
 *   <button class="ex-eg-btn" data-eg-open="eg-epec">Beispiel ansehen</button>
 *   <div class="ex-eg-backdrop" id="eg-epec">
 *     <div class="ex-eg" role="dialog" aria-modal="true"> … </div>
 *   </div>
 *
 * This file only handles open/close mechanics:
 *   - click the trigger button       → opens its target backdrop
 *   - click the backdrop (not panel)  → closes
 *   - click the ✕ (.ex-eg-close)      → closes
 *   - Escape                          → closes the open overlay
 *
 * The dialogue content is plain HTML and lives in the section, so the
 * persona switch (role-switch.js, [data-nd]) swaps its wording for free.
 */
(function () {
  'use strict';

  function openOverlay(backdrop) {
    if (!backdrop) return;
    backdrop.classList.add('open');
    var panel = backdrop.querySelector('.ex-eg');
    if (panel) {
      var close = panel.querySelector('.ex-eg-close');
      if (close) close.focus();
    }
  }

  function closeOverlay(backdrop) {
    if (backdrop) backdrop.classList.remove('open');
  }

  function closeAll() {
    document.querySelectorAll('.ex-eg-backdrop.open').forEach(closeOverlay);
  }

  function init() {
    // open triggers
    document.querySelectorAll('[data-eg-open]').forEach(function (btn) {
      if (btn._egWired) return;
      btn._egWired = true;
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-eg-open');
        openOverlay(document.getElementById(id));
      });
    });

    // backdrop click + ✕ button
    document.querySelectorAll('.ex-eg-backdrop').forEach(function (backdrop) {
      if (backdrop._egWired) return;
      backdrop._egWired = true;
      backdrop.addEventListener('click', function (ev) {
        if (ev.target === backdrop) closeOverlay(backdrop);
      });
      backdrop.querySelectorAll('.ex-eg-close').forEach(function (c) {
        c.addEventListener('click', function (ev) {
          ev.stopPropagation();
          closeOverlay(backdrop);
        });
      });
    });
  }

  // Escape closes whatever is open.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
