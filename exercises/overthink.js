/**
 * Übung D — Overthinking-Detektor.
 *
 * Embodies "mehr ≠ besser". Each scenario shows a task plus an effort bump
 * (e.g. Mittel → Hoch). The learner decides what the extra reasoning did:
 *   help  — the task was hard enough that deeper reasoning improved the answer
 *   waste — plateau: same answer, just more tokens & latency
 *   hurt  — overthinking: the model invents non-existent edge cases / worsens it
 * Immediate green/red feedback + rationale, running score, reset, reveal-all.
 *
 * Audience-aware: listens for 'rolechange' and swaps the whole scenario set
 * (same answer key, so scoring is identical across audiences).
 * No persistence, no API. Mounts via data-screen-label.
 */
(function () {
  'use strict';

  var OPT = [
    { key: 'help',  label: 'Sinnvoll' },
    { key: 'waste', label: 'Verschwendung' },
    { key: 'hurt',  label: 'Schadete' }
  ];

  // answer key (both audiences): [waste, hurt, help, waste, help]
  var SCN_BY_ROLE = {
    dev: [
      { text: 'Formatiere eine unsortierte JSON-Datei sauber ein.', change: 'Mittel → Hoch', correct: 'waste',
        why: 'Triviale Routine — schon bei Mittel am Limit. Mehr Reasoning ändert nichts außer Kosten und Latenz.' },
      { text: 'Wähle zwischen zwei fast identischen if-Bedingungen.', change: 'Niedrig → Hoch', correct: 'hurt',
        why: 'Overthinking. Das Modell erfindet Edge-Cases, die es nicht gibt, und verkompliziert eine eindeutige Entscheidung.' },
      { text: 'Entwirf das Datenbank-Schema für ein neues Feature.', change: 'Niedrig → Hoch', correct: 'help',
        why: 'Echte Komplexität: Relationen, Indizes, Edge-Cases. Mehr Reasoning findet Probleme, bevor sie teuer werden.' },
      { text: 'Bestimme die Big-O-Komplexität einer einfachen Schleife.', change: 'Mittel → Hoch', correct: 'waste',
        why: 'Mittel reicht locker. Die zusätzliche Nachdenkzeit bringt dieselbe Antwort — nur später und teurer.' },
      { text: 'Finde einen subtilen Off-by-one-Fehler in einer rekursiven Funktion.', change: 'Mittel → Hoch', correct: 'help',
        why: 'Rekursion plus Randfälle: mehr Reasoning spielt die Grenzwerte durch und findet den Fehler, den Mittel übersieht.' }
    ],
    nondev: [
      { text: 'Wandle eine Datumsliste ins US-Format um.', change: 'Mittel → Hoch', correct: 'waste',
        why: 'Mechanische Umwandlung — schon bei Mittel am Limit. Mehr Reasoning ändert nichts außer Kosten und Latenz.' },
      { text: 'Entscheide zwischen zwei fast identischen Formulierungen.', change: 'Niedrig → Hoch', correct: 'hurt',
        why: 'Overthinking. Das Modell zerredet eine eindeutige Wahl und erfindet Bedenken, die niemand hat.' },
      { text: 'Entwirf die Struktur eines komplexen Jahresberichts.', change: 'Niedrig → Hoch', correct: 'help',
        why: 'Viele Teile müssen zusammenpassen — Argumentationslinie, Reihenfolge, Konsistenz. Mehr Reasoning zahlt sich aus.' },
      { text: 'Runde eine Tabelle mit Zahlen auf zwei Nachkommastellen.', change: 'Mittel → Hoch', correct: 'waste',
        why: 'Reine Routine. Die zusätzliche Nachdenkzeit bringt dasselbe Ergebnis — nur später und teurer.' },
      { text: 'Plane die Argumentationslinie für eine schwierige Verhandlung mit mehreren Parteien.', change: 'Mittel → Hoch', correct: 'help',
        why: 'Mehrere Interessen greifen ineinander und müssen gegeneinander abgewogen werden — genau hier zahlt sich tieferes Durchdenken aus.' }
    ]
  };

  function labelOf(key) { for (var i = 0; i < OPT.length; i++) if (OPT[i].key === key) return OPT[i].label; return key; }

  function init() {
    var section = document.querySelector('section[data-screen-label*="Overthinking"]');
    if (!section) return;

    var grid     = section.querySelector('#overthink-grid');
    var statusEl = section.querySelector('#overthink-status');
    var resetBtn = section.querySelector('[data-overthink-action="reset"]');
    var revealBtn = section.querySelector('[data-overthink-action="reveal"]');

    var role = section.dataset.role || 'dev';
    var SCN = SCN_BY_ROLE[role] || SCN_BY_ROLE.dev;
    var state = [];
    var items = [];

    function buildCards() {
      SCN = SCN_BY_ROLE[role] || SCN_BY_ROLE.dev;
      state = SCN.map(function () { return { answered: false, picked: null }; });
      grid.innerHTML = '';
      SCN.forEach(function (s, i) {
        var item = document.createElement('div');
        item.className = 'ematch-item';
        var btns = OPT.map(function (o) {
          return '<button class="em-btn" type="button" data-i="' + i + '" data-opt="' + o.key + '">' + o.label + '</button>';
        }).join('');
        // Invisible sizer holds the longest possible feedback so the card
        // height never changes when buttons are swapped for the answer.
        item.innerHTML =
          '<div class="em-scn">' + s.text + ' <span class="em-meta">· Effort ' + s.change + '</span></div>' +
          '<div class="ematch-row"><div class="em-btns">' + btns + '</div></div>' +
          '<div class="em-fb-sizer" aria-hidden="true"><span class="em-fb-tag no">Daneben · richtig wäre „' + labelOf(s.correct) + '"</span> — ' + s.why + '</div>' +
          '<div class="em-fb"></div>';
        grid.appendChild(item);
      });
      items = Array.prototype.slice.call(grid.children);
    }

    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.em-btn');
      if (!btn) return;
      var i = parseInt(btn.getAttribute('data-i'), 10);
      if (state[i].answered) return;
      state[i].answered = true;
      state[i].picked = btn.getAttribute('data-opt');
      paint(i);
      updateStatus();
    });

    function paint(i) {
      var s = SCN[i];
      var item = items[i];
      item.classList.add('answered');
      var fb = item.querySelector('.em-fb');
      Array.prototype.forEach.call(item.querySelectorAll('.em-btn'), function (b) {
        var k = b.getAttribute('data-opt');
        b.classList.remove('picked-ok', 'picked-no', 'show-ok');
        if (state[i].picked === null) {
          if (k === s.correct) b.classList.add('show-ok');
        } else {
          if (k === state[i].picked) b.classList.add(k === s.correct ? 'picked-ok' : 'picked-no');
          else if (k === s.correct) b.classList.add('show-ok');
        }
      });
      if (state[i].picked === null) {
        fb.innerHTML = '<span class="em-fb-tag ok">Antwort · ' + labelOf(s.correct) + '</span> — ' + s.why;
      } else if (state[i].picked === s.correct) {
        fb.innerHTML = '<span class="em-fb-tag ok">Richtig · ' + labelOf(s.correct) + '</span> — ' + s.why;
      } else {
        fb.innerHTML = '<span class="em-fb-tag no">Daneben · richtig wäre „' + labelOf(s.correct) + '"</span> — ' + s.why;
      }
    }

    function updateStatus() {
      var answered = 0, correct = 0;
      state.forEach(function (st, i) {
        if (st.answered) answered++;
        if (st.answered && st.picked === SCN[i].correct) correct++;
      });
      var userAnswered = state.filter(function (st) { return st.picked !== null; }).length;
      if (answered === 0) {
        statusEl.textContent = 'Noch nichts beantwortet.';
      } else if (userAnswered === 0) {
        statusEl.innerHTML = 'Aufgelöst — <span class="score">' + answered + ' / ' + SCN.length + '</span> gezeigt.';
      } else {
        statusEl.innerHTML = '<span class="score">' + correct + ' / ' + userAnswered + '</span> richtig' +
          (answered < SCN.length ? ' · ' + (SCN.length - answered) + ' offen' : ' · alle beantwortet');
      }
    }

    revealBtn.addEventListener('click', function () {
      state.forEach(function (st, i) {
        if (!st.answered) { st.answered = true; st.picked = null; paint(i); }
      });
      updateStatus();
    });

    resetBtn.addEventListener('click', function () {
      buildCards();
      updateStatus();
    });

    section.addEventListener('rolechange', function (e) {
      role = (e.detail && e.detail.role) || 'dev';
      buildCards();
      updateStatus();
    });

    buildCards();
    updateStatus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
