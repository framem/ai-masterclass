/**
 * Übung B — Effort-Match.
 *
 * Ten real tasks; assign each the right reasoning-effort level
 * (Niedrig / Mittel / Hoch). Immediate green/red feedback + rationale,
 * running score, reset, and a "reveal all" that solves the rest.
 *
 * No persistence, no API. Mounts via data-screen-label.
 */
(function () {
  'use strict';

  var LV = [
    { key: 'low',  label: 'Niedrig' },
    { key: 'med',  label: 'Mittel'  },
    { key: 'high', label: 'Hoch'    }
  ];

  // Two audience framings, identical answer key
  // [low,high,low,high,med,high,med,low,high,med]
  // so scoring behaves the same; only the task wording differs.
  var SCN_BY_ROLE = {
    dev: [
      {
        text: 'Sortiere 200 Server-Logs nach Fehler-Schweregrad.',
        meta: 'Stapel-Job · Kosten ×200',
        correct: 'low',
        why: 'Klassifikation in Masse. Mehr Nachdenken <b>pro Log</b> kostet nur Zeit und Geld — der Effort multipliziert sich mit 200.'
      },
      {
        text: 'Beweise, dass ein verteilter Sperr-Algorithmus deadlock-frei ist.',
        meta: 'formale Logik',
        correct: 'high',
        why: 'Mehrstufiges, formales Reasoning. Jeder übersprungene Gedankenschritt versteckt einen Fehler im Beweis.'
      },
      {
        text: 'Generiere Docstrings für 12 triviale Getter-Methoden.',
        meta: 'Routine · Volumen',
        correct: 'low',
        why: 'Mechanische Routine. Das kann das Modell aus dem Stand — Deliberation ändert das Ergebnis nicht.'
      },
      {
        text: 'Plane ein Migrations-Skript für ein Schema mit 30 Tabellen und Fremdschlüsseln.',
        meta: 'Abhängigkeiten · Reihenfolge',
        correct: 'high',
        why: 'Reihenfolge und Abhängigkeiten müssen stimmen. Planungsfehler sind teuer und schwer rückgängig zu machen.'
      },
      {
        text: 'Fasse einen PR-Diff in 5 Review-Bullet-Points zusammen.',
        meta: 'Gewichtung nötig',
        correct: 'med',
        why: 'Etwas Urteilsvermögen — was ist wichtig? — aber kein tiefes Reasoning. Der vernünftige Default.'
      },
      {
        text: 'Debugge, warum ein Test nur in CI fehlschlägt, lokal aber grün ist.',
        meta: 'Hypothesen bilden',
        correct: 'high',
        why: 'Hypothesen über Umgebungsunterschiede bilden, durchspielen und ausschließen — genau dafür ist hoher Effort da.'
      },
      {
        text: 'Wähle passende HTTP-Statuscodes für sechs neue API-Endpunkte.',
        meta: 'Urteil pro Fall',
        correct: 'med',
        why: 'Pro Endpunkt eine kleine Abwägung — Konvention oder Sonderfall? Urteilsvermögen, aber kein tiefes Reasoning. Der Default.'
      },
      {
        text: 'Konvertiere 500 CSV-Zeilen ins JSON-Format.',
        meta: 'Massen-Transform',
        correct: 'low',
        why: 'Reine Formattransformation in Masse. Der Effort multipliziert sich mit jeder Zeile — und ändert am Ergebnis nichts.'
      },
      {
        text: 'Finde die Ursache einer sporadischen Race-Condition in nebenläufigem Code.',
        meta: 'nebenläufig · selten reproduzierbar',
        correct: 'high',
        why: 'Mehrere Ausführungsreihenfolgen gedanklich durchspielen, bis die eine passt — eine klassische Aufgabe für hohen Effort.'
      },
      {
        text: 'Schreibe sinnvolle Unit-Test-Fälle für eine überschaubare reine Funktion.',
        meta: 'Abdeckung abwägen',
        correct: 'med',
        why: 'Welche Fälle sind relevant? Etwas Abwägung — aber die Funktion ist überschaubar, Mittel reicht.'
      }
    ],
    nondev: [
      {
        text: 'Sortiere 200 Support-Tickets nach Dringlichkeit.',
        meta: 'Stapel-Job · Kosten ×200',
        correct: 'low',
        why: 'Klassifikation in Masse. Mehr Nachdenken <b>pro Ticket</b> kostet nur Zeit und Geld — der Effort multipliziert sich mit 200.'
      },
      {
        text: 'Erstelle einen Quartals-Finanzplan mit mehreren Szenarien und Annahmen.',
        meta: 'Abhängigkeiten · Modellierung',
        correct: 'high',
        why: 'Annahmen greifen ineinander, ein Fehler pflanzt sich fort. Genau die Art mehrstufiges Reasoning, die Effort braucht.'
      },
      {
        text: 'Formuliere eine höfliche Terminabsage.',
        meta: 'Standardtext',
        correct: 'low',
        why: 'Sprachliche Routine. Das kann das Modell aus dem Stand — Deliberation ändert das Ergebnis nicht.'
      },
      {
        text: 'Plane die Logistik für ein Firmen-Event mit 12 voneinander abhängigen Schritten.',
        meta: 'Reihenfolge · Abhängigkeiten',
        correct: 'high',
        why: 'Reihenfolge und Abhängigkeiten müssen stimmen. Planungsfehler fällt erst am Event-Tag auf — dann ist es teuer.'
      },
      {
        text: 'Fasse ein 2-seitiges Meeting-Protokoll in 5 Bullet-Points zusammen.',
        meta: 'Gewichtung nötig',
        correct: 'med',
        why: 'Etwas Urteilsvermögen — was ist wichtig? — aber kein tiefes Reasoning. Der vernünftige Default.'
      },
      {
        text: 'Entwickle eine Preisstrategie für einen neuen Markt mit mehreren Annahmen.',
        meta: 'Hypothesen abwägen',
        correct: 'high',
        why: 'Annahmen bilden, durchspielen und gegeneinander abwägen — genau dafür ist hoher Effort da.'
      },
      {
        text: 'Wähle den passenden Tonfall für sechs verschiedene Kunden-E-Mails.',
        meta: 'Urteil pro Fall',
        correct: 'med',
        why: 'Pro Mail eine kleine Abwägung — formell oder locker? Urteilsvermögen, aber kein tiefes Reasoning. Der Default.'
      },
      {
        text: 'Übertrage 500 Adressen aus einer Liste in ein Formular-Format.',
        meta: 'Massen-Transform',
        correct: 'low',
        why: 'Reine Übertragung in Masse. Der Effort multipliziert sich mit jeder Zeile — und ändert am Ergebnis nichts.'
      },
      {
        text: 'Finde heraus, warum die Quartalszahlen aus zwei Quellen nicht übereinstimmen.',
        meta: 'Diskrepanz · viele Ursachen',
        correct: 'high',
        why: 'Mögliche Fehlerquellen einzeln bilden und ausschließen, bis die Differenz erklärt ist — genau dafür ist hoher Effort da.'
      },
      {
        text: 'Gliedere eine 20-minütige Präsentation in sinnvolle Abschnitte.',
        meta: 'Gewichtung nötig',
        correct: 'med',
        why: 'Was gehört wohin, was ist am wichtigsten? Etwas Struktur-Urteil — aber kein tiefes Reasoning, Mittel reicht.'
      }
    ]
  };

  var SCN = SCN_BY_ROLE.dev;

  function labelOf(key) { for (var i = 0; i < LV.length; i++) if (LV[i].key === key) return LV[i].label; return key; }

  function init() {
    var section = document.querySelector('section[data-screen-label*="Effort-Match"]');
    if (!section) return;

    var grid    = section.querySelector('#ematch-grid');
    var statusEl = section.querySelector('#ematch-status');
    var resetBtn = section.querySelector('[data-ematch-action="reset"]');
    var revealBtn = section.querySelector('[data-ematch-action="reveal"]');

    var role = section.dataset.role || 'dev';
    SCN = SCN_BY_ROLE[role] || SCN_BY_ROLE.dev;
    var state = SCN.map(function () { return { answered: false, picked: null }; });
    var items = [];

    // ---- build cards (also used to rebuild on audience switch) ----
    function buildCards() {
      SCN = SCN_BY_ROLE[role] || SCN_BY_ROLE.dev;
      state = SCN.map(function () { return { answered: false, picked: null }; });
      grid.innerHTML = '';
      SCN.forEach(function (s, i) {
        var item = document.createElement('div');
        item.className = 'ematch-item';
        var btns = LV.map(function (l) {
          return '<button class="em-btn" type="button" data-i="' + i + '" data-lvl="' + l.key + '">' + l.label + '</button>';
        }).join('');
        // Invisible sizer holds the longest possible feedback so the card
        // height never changes when buttons are swapped for the answer.
        item.innerHTML =
          '<div class="em-scn">' + s.text + ' <span class="em-meta">· ' + s.meta + '</span></div>' +
          '<div class="ematch-row"><div class="em-btns">' + btns + '</div></div>' +
          '<div class="em-fb-sizer" aria-hidden="true"><span class="em-fb-tag no">Daneben · richtig wäre ' + labelOf(s.correct) + '</span> — ' + s.why + '</div>' +
          '<div class="em-fb"></div>';
        grid.appendChild(item);
      });
      items = Array.prototype.slice.call(grid.children);
    }
    buildCards();

    // ---- audience switch: swap the whole scenario set ----
    section.addEventListener('rolechange', function (e) {
      role = (e.detail && e.detail.role) || 'dev';
      buildCards();
      updateStatus();
    });

    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.em-btn');
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
      var fb = item.querySelector('.em-fb');
      Array.prototype.forEach.call(item.querySelectorAll('.em-btn'), function (b) {
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
        fb.innerHTML = '<span class="em-fb-tag ok">Lösung · ' + labelOf(s.correct) + '</span> — ' + s.why;
      } else if (state[i].picked === s.correct) {
        fb.innerHTML = '<span class="em-fb-tag ok">Richtig · ' + labelOf(s.correct) + '</span> — ' + s.why;
      } else {
        fb.innerHTML = '<span class="em-fb-tag no">Daneben · richtig wäre ' + labelOf(s.correct) +
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
        item.querySelector('.em-fb').innerHTML = '';
        Array.prototype.forEach.call(item.querySelectorAll('.em-btn'), function (b) {
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
