/**
 * Übung — Welche Stufe? (Befehl / Plan / Ziel)
 *
 * Acht reale Szenarien; ordne jedem die passende Autonomie-Stufe zu.
 * Sofort grün/rot + Begründung, laufender Punktestand, Reset und ein
 * "Alles auflösen", das den Rest zeigt. Zwei Persona-Framings (Dev /
 * Non-Dev) mit identischem Lösungsschlüssel.
 *
 * Kein Persistence, keine API. Mountet über die Grid-ID #stage-grid.
 * Spiegelt das Muster von exercises/effort-match.js.
 */
(function () {
  'use strict';

  var LV = [
    { key: 'cmd',  label: 'Befehl' },
    { key: 'plan', label: 'Plan'   },
    { key: 'goal', label: 'Ziel'   }
  ];

  // Identischer Lösungsschlüssel für beide Framings:
  // [cmd, plan, goal, cmd, plan, goal, cmd, plan]
  var SCN_BY_ROLE = {
    dev: [
      {
        text: 'Korrigiere einen Tippfehler in einer Fehlermeldung.',
        meta: 'eindeutig · winzig',
        correct: 'cmd',
        why: 'Eindeutig und winzig. Ein Satz genügt, kein Plan nötig — <b>Befehl</b>.'
      },
      {
        text: 'Baue ein neues Auth-Feature über fünf Dateien — beim Vorgehen bist du unsicher.',
        meta: 'mehrteilig · Unsicherheit',
        correct: 'plan',
        why: 'Mehrere Dateien + Unsicherheit. Lass dir das Vorgehen vor dem Code zeigen — <b>Plan</b>.'
      },
      {
        text: 'Bring die rote CI-Pipeline wieder grün — die Tests sind verlässlich.',
        meta: 'klares Ziel · starke Guardrails',
        correct: 'goal',
        why: 'Klares Ziel + verlässliche Tests als Guardrail. Lass den Loop laufen, prüf den PR — <b>Ziel</b>.'
      },
      {
        text: 'Benenne eine Funktion um — du weißt genau, wo sie überall vorkommt.',
        meta: 'präzise · mechanisch',
        correct: 'cmd',
        why: 'Präzise und mechanisch. Direkt ansagen — <b>Befehl</b>.'
      },
      {
        text: 'Plane ein größeres Refactoring, dessen Vorgehen du vor dem Start absegnen willst.',
        meta: 'Tragweite · Freigabe',
        correct: 'plan',
        why: 'Du willst die Freigabe vor dem Start. Erst absegnen, dann ausführen lassen — <b>Plan</b>.'
      },
      {
        text: 'Migriere ein Modul auf die neue API — die Tests decken es ab und du vertraust ihnen.',
        meta: 'abgegrenzt · verlässliche Tests',
        correct: 'goal',
        why: 'Abgegrenzt + verlässliche Guardrails. Lass den Loop laufen, prüf den PR — <b>Ziel</b>.'
      },
      {
        text: 'Ändere den Timeout-Wert von 30 auf 60 Sekunden.',
        meta: 'ein Wert · klar',
        correct: 'cmd',
        why: 'Ein einzelner, klar benannter Wert. Kein Spielraum, keine Planung — <b>Befehl</b>.'
      },
      {
        text: 'Führe eine neue State-Management-Library ein — den Schnitt willst du erst durchdenken.',
        meta: 'Architektur · offen',
        correct: 'plan',
        why: 'Architektur-Entscheidung mit offenem Vorgehen. Erst den Plan sehen, dann umsetzen — <b>Plan</b>.'
      }
    ],
    nondev: [
      {
        text: 'Korrigiere einen Tippfehler in einer Standard-E-Mail-Vorlage.',
        meta: 'eindeutig · winzig',
        correct: 'cmd',
        why: 'Eindeutig und winzig. Ein Satz genügt, kein Plan nötig — <b>Befehl</b>.'
      },
      {
        text: 'Erstelle einen Schulungsplan für ein neues Tool über mehrere Abteilungen — beim Vorgehen bist du unsicher.',
        meta: 'mehrteilig · Unsicherheit',
        correct: 'plan',
        why: 'Mehrere Abteilungen + Unsicherheit. Lass dir das Vorgehen vorab zeigen — <b>Plan</b>.'
      },
      {
        text: 'Bereinige die Kundendatenbank von doppelten Einträgen — die Abgleichregeln erkennen jeden Treffer zuverlässig.',
        meta: 'klares Ziel · starke Guardrails',
        correct: 'goal',
        why: 'Klares Ziel + verlässliche Abgleichregeln als Guardrail. Lass den Loop laufen, prüf das Ergebnis — <b>Ziel</b>.'
      },
      {
        text: 'Benenne einen Begriff in allen Dokumenten um — du weißt genau, wo er vorkommt.',
        meta: 'präzise · mechanisch',
        correct: 'cmd',
        why: 'Präzise und mechanisch. Direkt ansagen — <b>Befehl</b>.'
      },
      {
        text: 'Plane eine größere Umstrukturierung, deren Vorgehen du vor dem Start absegnen willst.',
        meta: 'Tragweite · Freigabe',
        correct: 'plan',
        why: 'Du willst die Freigabe vor dem Start. Erst absegnen, dann ausführen lassen — <b>Plan</b>.'
      },
      {
        text: 'Übertrage alle Quartalsrechnungen ins neue Format — die Validierungsregeln prüfen jeden Eintrag.',
        meta: 'abgegrenzt · verlässliche Prüfung',
        correct: 'goal',
        why: 'Abgegrenzt + verlässliche Guardrails. Lass den Loop laufen, prüf das Ergebnis — <b>Ziel</b>.'
      },
      {
        text: 'Ändere in der Vorlage die Frist von 14 auf 30 Tage.',
        meta: 'ein Wert · klar',
        correct: 'cmd',
        why: 'Ein einzelner, klar benannter Wert. Kein Spielraum, keine Planung — <b>Befehl</b>.'
      },
      {
        text: 'Bereite die Zusammenlegung mehrerer Mail-Verteiler vor — welche Gruppen wie zusammenkommen, willst du erst durchsprechen.',
        meta: 'offen · Abstimmung',
        correct: 'plan',
        why: 'Offenes Vorgehen mit Abstimmungsbedarf. Erst den Plan sehen, dann umsetzen — <b>Plan</b>.'
      }
    ]
  };

  var SCN = SCN_BY_ROLE.dev;

  function labelOf(key) { for (var i = 0; i < LV.length; i++) if (LV[i].key === key) return LV[i].label; return key; }

  function init() {
    var grid = document.getElementById('stage-grid');
    if (!grid) return;
    var section = grid.closest('section');

    var statusEl  = section.querySelector('#stage-status');
    var resetBtn  = section.querySelector('[data-stage-action="reset"]');
    var revealBtn = section.querySelector('[data-stage-action="reveal"]');

    var role = section.dataset.role || 'dev';
    SCN = SCN_BY_ROLE[role] || SCN_BY_ROLE.dev;
    var state = SCN.map(function () { return { answered: false, picked: null }; });
    var items = [];

    function buildCards() {
      SCN = SCN_BY_ROLE[role] || SCN_BY_ROLE.dev;
      state = SCN.map(function () { return { answered: false, picked: null }; });
      grid.innerHTML = '';
      SCN.forEach(function (s, i) {
        var item = document.createElement('div');
        item.className = 'smatch-item';
        var btns = LV.map(function (l) {
          return '<button class="sm-btn" type="button" data-i="' + i + '" data-lvl="' + l.key + '">' + l.label + '</button>';
        }).join('');
        // Unsichtbarer Sizer reserviert die Höhe der längsten Begründung,
        // damit die Karte beim Auflösen nicht springt.
        item.innerHTML =
          '<div class="sm-scn">' + s.text + ' <span class="sm-meta">· ' + s.meta + '</span></div>' +
          '<div class="smatch-row"><div class="sm-btns">' + btns + '</div></div>' +
          '<div class="sm-fb-sizer" aria-hidden="true"><span class="sm-fb-tag no">Daneben · richtig wäre ' + labelOf(s.correct) + '</span> — ' + s.why + '</div>' +
          '<div class="sm-fb"></div>';
        grid.appendChild(item);
      });
      items = Array.prototype.slice.call(grid.children);
    }
    buildCards();

    section.addEventListener('rolechange', function (e) {
      role = (e.detail && e.detail.role) || 'dev';
      buildCards();
      updateStatus();
    });

    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.sm-btn');
      if (!btn) return;
      var i = parseInt(btn.getAttribute('data-i'), 10);
      if (state[i].answered) return;
      answer(i, btn.getAttribute('data-lvl'));
    });

    function answer(i, lvl) {
      state[i].answered = true;
      state[i].picked = lvl;
      paint(i);
      updateStatus();
    }

    function paint(i) {
      var s = SCN[i];
      var item = items[i];
      item.classList.add('answered');
      var fb = item.querySelector('.sm-fb');
      Array.prototype.forEach.call(item.querySelectorAll('.sm-btn'), function (b) {
        var k = b.getAttribute('data-lvl');
        b.classList.remove('picked-ok', 'picked-no', 'show-ok');
        if (state[i].picked === null) {
          if (k === s.correct) b.classList.add('show-ok');
        } else {
          if (k === state[i].picked) b.classList.add(k === s.correct ? 'picked-ok' : 'picked-no');
          else if (k === s.correct) b.classList.add('show-ok');
        }
      });

      if (state[i].picked === null) {
        fb.innerHTML = '<span class="sm-fb-tag ok">Lösung · ' + labelOf(s.correct) + '</span> — ' + s.why;
      } else if (state[i].picked === s.correct) {
        fb.innerHTML = '<span class="sm-fb-tag ok">Richtig · ' + labelOf(s.correct) + '</span> — ' + s.why;
      } else {
        fb.innerHTML = '<span class="sm-fb-tag no">Daneben · richtig wäre ' + labelOf(s.correct) +
          '</span> — ' + s.why;
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
        statusEl.innerHTML = 'Aufgelöst — <span class="score">' + answered + ' / ' + SCN.length + '</span> Stufen gezeigt.';
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
      state = SCN.map(function () { return { answered: false, picked: null }; });
      items.forEach(function (item) {
        item.classList.remove('answered');
        item.querySelector('.sm-fb').innerHTML = '';
        Array.prototype.forEach.call(item.querySelectorAll('.sm-btn'), function (b) {
          b.classList.remove('picked-ok', 'picked-no', 'show-ok');
        });
      });
      updateStatus();
    });

    updateStatus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
