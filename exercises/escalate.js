/**
 * Übung C — Eskalations-Leiter (v2, schwerer).
 *
 * Embodies the deck's core rule of thumb: "Niedrig starten, gezielt
 * eskalieren." A task starts on Niedrig. The learner reads a SIMULATED MODEL
 * ANSWER (not a quality number!) and must judge for themselves whether it is
 * good enough. Quality percentages are revealed only AFTER the decision.
 *
 * Three levers:
 *   ACCEPT   — stop here, take the answer
 *   ESCALATE — climb one rung, pay its tokens (cumulative, no way back down)
 *   CONTEXT  — recognize that the problem is missing information, not effort
 *
 * One task per set is a context trap: every escalation produces longer
 * guessing, never knowledge. Task tags are content-based, not difficulty-
 * based, so they don't leak the answer.
 *
 * Audience-aware: listens for 'rolechange' and swaps the whole task set.
 * No persistence, no API. Mounts via data-screen-label.
 */
(function () {
  'use strict';

  var GOOD = 85; // quality threshold for "good enough"
  var LEVELS = [
    { name: 'Niedrig', rtok: 60 },
    { name: 'Mittel',  rtok: 450 },
    { name: 'Hoch',    rtok: 2000 }
  ];

  // sweet = lowest level whose quality >= GOOD. needsContext: true => the
  // correct move is the context lever, ideally before any escalation.
  var TASKS_BY_ROLE = {
    dev: [
      {
        tag: 'Refactoring',
        text: 'Refactore eine 200-Zeilen-Funktion in kleinere, getestete Einheiten.',
        quality: [58, 88, 91],
        samples: [
          '„Fertig! Ich habe die Funktion in fünf Hilfsfunktionen aufgeteilt. Zwei davon teilen sich eine modulweite Statusvariable, und die Fehlerbehandlung habe ich der Übersichtlichkeit halber entfernt. Die Tests habe ich nicht ausgeführt — sollte aber passen.“',
          '„Aufgeteilt in vier reine Funktionen mit klaren Signaturen, Verhalten unverändert — alle 23 bestehenden Tests laufen grün. Ein offenes TODO: das Logging könnte noch zentralisiert werden.“',
          '„Wie zuvor sauber aufgeteilt, alle Tests grün — zusätzlich Property-Based-Tests und ein Benchmark, der 3 % Speedup belegt. Am Kern der Lösung hat der Mehraufwand nichts geändert.“'
        ],
        lesson: 'Die Warnsignale standen im Text: geteilte Statusvariable, entfernte Fehlerbehandlung, Tests nie ausgeführt — „fertig!“ heißt nicht fertig.'
      },
      {
        tag: 'Aufräumen',
        text: 'Benenne diese 8 Variablen aussagekräftiger um.',
        quality: [92, 94, 95],
        samples: [
          '„data → userRecords, tmp → pendingInvoices, x1 → retryCount … alle 8 umbenannt, konsistent im camelCase, alle Verwendungsstellen angepasst. Diff: 14 Zeilen, Tests grün.“',
          '„Gleiche Umbenennungen wie eben — zusätzlich ein Absatz Begründung pro Variable und ein Vorschlag für eine teamweite Namenskonvention.“',
          '„Umbenennungen wie zuvor. Außerdem schlage ich vor, das Modul in drei Klassen aufzuteilen — Migrationsplan anbei. Danach war allerdings nicht gefragt.“'
        ],
        lesson: 'Routine-Mechanik: Schon Niedrig liefert alles, was gefragt war. Jede Eskalation kauft nur ungefragten Zusatz.'
      },
      {
        tag: 'Tests',
        text: 'Schreibe Unit-Tests für ein Modul mit verschachtelter async-Logik.',
        quality: [50, 76, 90],
        samples: [
          '„12 Tests geschrieben, alle grün — abgedeckt ist der Happy-Path. Die Retry- und Timeout-Pfade habe ich weggemockt, Race-Conditions kommen in den Tests nicht vor.“',
          '„31 Tests, decken auch Fehlerpfade und Timeouts ab. Aber: Die Race-Condition zwischen Retry und Abort konnte ich nicht deterministisch testen — der Test war flaky, ich habe ihn auskommentiert.“',
          '„Mit Fake-Timern statt echter Delays sind jetzt alle Pfade deterministisch testbar — inklusive der Race zwischen Retry und Abort. 38 stabile Tests, 96 % Branch-Coverage.“'
        ],
        lesson: 'Mittel klang fast gut — aber ein auskommentierter, flakiger Test ist bei async-Logik genau das Loch, das in Produktion aufreißt.'
      },
      {
        tag: 'Bug-Jagd',
        text: 'Der Report zeigt seit Dienstag falsche Summen. Finde die Ursache.',
        quality: [38, 46, 52],
        needsContext: true,
        samples: [
          '„Ohne Logs oder Zugriff auf die Pipeline kann ich nur raten: vielleicht eine Zeitzonen-Umstellung? Oder das Deployment vom Montag? Prüfe am besten beides.“',
          '„Ich habe länger nachgedacht und fünf mögliche Ursachen sortiert: Zeitzonen, Caching, Rundung, Duplikate, Schema-Drift. Welche zutrifft, kann ich ohne die Daten nicht sagen.“',
          '„Hier ist eine ausführliche Analyse aller denkbaren Fehlerquellen mit Entscheidungsbaum. Es bleibt Spekulation: Mir fehlen die Logs, das Diff des Deployments und eine fehlerhafte Beispielzeile.“'
        ],
        lesson: 'Die Antwort sagt es von Anfang an selbst: Es fehlen Logs und Daten. Mehr Denkzeit macht aus Raten kein Wissen.'
      }
    ],
    nondev: [
      {
        tag: 'Pitch',
        text: 'Schreibe einen überzeugenden Projekt-Pitch für die Geschäftsführung.',
        quality: [60, 88, 91],
        samples: [
          '„Unser innovatives Projekt schafft Synergien, hebt Potenziale und steigert die Effizienz nachhaltig …“ — liest sich flüssig, enthält aber keine einzige Zahl, keinen konkreten Nutzen und passt wortgleich auf jedes beliebige Projekt.',
          '„Klarer Aufbau: Problem (3 h manuelle Arbeit pro Woche und Person), Lösung, Kosten 12 k€, Amortisation nach 5 Monaten — und am Ende ein konkreter Ask an die GF.“',
          '„Wie eben — zusätzlich eine Sensitivitätsanalyse mit drei Szenarien und ein Konkurrenzvergleich über vier Seiten. Mehr, als die GF für eine Freigabe lesen wird.“'
        ],
        lesson: 'Flüssig ≠ gut: Der erste Pitch klingt souverän, ist aber austauschbar. Erst Mittel bringt Zahlen und einen konkreten Ask.'
      },
      {
        tag: 'Korrektur',
        text: 'Korrigiere Rechtschreibung und Grammatik in diesem Absatz.',
        quality: [93, 94, 95],
        samples: [
          '„Alle 6 Fehler korrigiert: ein Komma, einmal dass/das, zwei Tippfehler, zwei Groß-/Kleinschreibungen. Änderungsliste anbei — Ton und Aufbau unverändert.“',
          '„Fehler korrigiert — und zusätzlich den Ton ‚professioneller‘ umgeschrieben. Drei Sätze klingen jetzt deutlich anders als dein Original.“',
          '„Fehler korrigiert, den Absatz komplett umstrukturiert und zwei neue Sätze ergänzt. Das war allerdings nicht der Auftrag.“'
        ],
        lesson: 'Korrigieren ist Mechanik — Niedrig genügt. Höhere Stufen fangen an, ungefragt umzuschreiben.'
      },
      {
        tag: 'Reorg',
        text: 'Entwirf eine Umstrukturierung der Abteilung mit Rollen und Übergaben.',
        quality: [52, 74, 89],
        samples: [
          '„Hier ist das neue Organigramm.“ — Sonst nichts: keine Übergaben, kein Zeitplan, keine Antwort darauf, was mit den zwei wegfallenden Rollen passiert.',
          '„Plausibler Plan mit Rollen und Übergangsphasen. Zwei zentrale Fragen bleiben offen: wer die Budgetverantwortung übernimmt und wie der Betriebsrat eingebunden wird.“',
          '„Rollen, Übergaben, 90-Tage-Plan, Risiken samt Gegenmaßnahmen — inklusive Klärung der Budgetverantwortung und der Mitbestimmung. Belastbar.“'
        ],
        lesson: 'Offene Budget- und Mitbestimmungsfragen sind keine Fußnoten — genau daran scheitern Umstrukturierungen.'
      },
      {
        tag: 'Analyse',
        text: 'Warum ist die Kundenzufriedenheit in Q2 eingebrochen?',
        quality: [36, 45, 51],
        needsContext: true,
        samples: [
          '„Ohne die Umfragedaten kann ich nur allgemeine Ursachen nennen: die Preiserhöhung? Längere Support-Wartezeiten? Ein Produktfehler?“',
          '„Nach längerem Nachdenken: eine sortierte Liste typischer Ursachen aus der Fachliteratur. Welche bei euch zutrifft, steht nicht in meinem Kontext.“',
          '„Ein detailliertes Ursachen-Framework mit Gewichtung — komplett hypothetisch. Mir fehlen die Q2-Umfrage, die Support-Tickets und die Churn-Zahlen.“'
        ],
        lesson: 'Die Antwort nennt selbst, was fehlt: die Daten. Eskalation produziert nur längere Hypothesenlisten.'
      }
    ]
  };

  function sweetOf(t) {
    for (var i = 0; i < t.quality.length; i++) if (t.quality[i] >= GOOD) return i;
    return t.quality.length - 1;
  }
  function cumTok(level) { var s = 0; for (var i = 0; i <= level; i++) s += LEVELS[i].rtok; return s; }
  function qCls(q) { return q >= GOOD ? 'q-ok' : (q >= 60 ? 'q-mid' : 'q-bad'); }
  function fmtTok(n) { return n.toLocaleString('de-DE') + ' tok'; }

  function init() {
    var section = document.querySelector('section[data-screen-label*="Eskalations-Leiter"]');
    if (!section) return;

    var tasksEl   = section.querySelector('#esc-tasks');
    var ladderEl  = section.querySelector('#esc-ladder');
    var sampleLvl = section.querySelector('#esc-sample-level');
    var sampleCost = section.querySelector('#esc-sample-cost');
    var sampleBody = section.querySelector('#esc-sample-body');
    var spentEl   = section.querySelector('#esc-spent');
    var scoreEl   = section.querySelector('#esc-score');
    var acceptBtn = section.querySelector('[data-esc="accept"]');
    var escBtn    = section.querySelector('[data-esc="escalate"]');
    var ctxBtn    = section.querySelector('[data-esc="context"]');
    var resetBtn  = section.querySelector('[data-esc="reset-all"]');
    var verdict    = section.querySelector('#esc-verdict');
    var verdictLbl = section.querySelector('#esc-verdict-label');
    var verdictTxt = section.querySelector('#esc-verdict-text');
    var curveEl    = section.querySelector('#esc-curve');

    var role = section.dataset.role || 'dev';
    var TASKS = TASKS_BY_ROLE[role] || TASKS_BY_ROLE.dev;

    var activeTask = 0;
    var level = 0;        // current rung
    var locked = false;   // decided?
    var results = [];     // per task: { action, level, cls }

    function chipFor(cls) { return cls === 'ok' ? '✓' : (cls === 'over' ? '~' : '✗'); }

    function buildTasks() {
      tasksEl.innerHTML = '';
      TASKS.forEach(function (t, i) {
        var card = document.createElement('div');
        card.className = 'dial-task' + (i === activeTask ? ' active' : '');
        var chip = results[i] ? '<span class="dt-chip ' + results[i].cls + '">' + chipFor(results[i].cls) + '</span>' : '';
        card.innerHTML = '<div class="dt-tag">' + t.tag + '</div><div class="dt-text">' + t.text + '</div>' + chip;
        card.addEventListener('click', function () {
          activeTask = i;
          Array.prototype.forEach.call(tasksEl.children, function (c, j) { c.classList.toggle('active', j === i); });
          if (results[i]) { restoreDecided(i); } else { resetRun(); }
        });
        tasksEl.appendChild(card);
      });
    }

    function updateScore() {
      var n = 0, spent = 0, opt = 0;
      TASKS.forEach(function (t, i) {
        if (!results[i]) return;
        n++;
        spent += cumTok(results[i].level);
        opt += cumTok(t.needsContext ? 0 : sweetOf(t));
      });
      if (n === TASKS.length) {
        scoreEl.innerHTML = 'Fertig · <strong>' + fmtTok(spent) + '</strong> ausgegeben · Optimum ' + fmtTok(opt);
      } else {
        scoreEl.textContent = n + '/' + TASKS.length + ' entschieden';
      }
    }

    function resetRun() {
      level = 0;
      locked = false;
      render();
    }

    function restoreDecided(i) {
      level = results[i].level;
      locked = true;
      render();
      showVerdict(TASKS[i], results[i]);
    }

    function render() {
      var t = TASKS[activeTask];

      // ladder rungs (rendered top = Hoch, bottom = Niedrig)
      ladderEl.innerHTML = '';
      for (var lv = LEVELS.length - 1; lv >= 0; lv--) {
        var rung = document.createElement('div');
        var state = lv === level ? 'current' : (lv < level ? 'climbed' : 'ahead');
        rung.className = 'esc-rung ' + state;
        rung.innerHTML =
          '<div class="er-name">' + LEVELS[lv].name + '</div>' +
          '<div class="er-tok">+' + fmtTok(LEVELS[lv].rtok) + '</div>';
        ladderEl.appendChild(rung);
      }

      // the answer to judge — no numbers, only text
      sampleLvl.textContent = 'Modell-Antwort · Stufe „' + LEVELS[level].name + '“';
      sampleCost.textContent = '+' + fmtTok(LEVELS[level].rtok);
      sampleBody.textContent = t.samples[level];

      // token account
      spentEl.textContent = fmtTok(cumTok(level));

      // buttons
      escBtn.disabled = locked || level >= LEVELS.length - 1;
      acceptBtn.disabled = locked;
      ctxBtn.disabled = locked;

      if (!locked) {
        verdict.className = 'esc-verdict';
        verdictLbl.textContent = 'Deine Entscheidung';
        verdictTxt.innerHTML = 'Reicht das für den Zweck? <strong>Akzeptieren</strong>, <strong>eskalieren</strong> — oder fehlt dem Modell etwas, das keine Denkzeit ersetzt?';
        curveEl.hidden = true;
        curveEl.innerHTML = '';
      }
      updateScore();
    }

    function renderCurve(t) {
      var sweet = sweetOf(t);
      curveEl.innerHTML = '';
      LEVELS.forEach(function (L, i) {
        var chip = document.createElement('span');
        var isSweet = !t.needsContext && i === sweet;
        chip.className = 'ec-chip ' + qCls(t.quality[i]) + (isSweet ? ' sweet' : '');
        chip.textContent = L.name + ' ' + t.quality[i] + ' %' + (isSweet ? ' · Sweet-Spot' : '');
        curveEl.appendChild(chip);
      });
      if (t.needsContext) {
        var extra = document.createElement('span');
        extra.className = 'ec-chip q-ok';
        extra.textContent = '+ Kontext → gut genug';
        curveEl.appendChild(extra);
      }
      curveEl.hidden = false;
    }

    function showVerdict(t, res) {
      var sweet = sweetOf(t);
      var spent = cumTok(res.level);
      var q = t.quality[res.level];
      var cls = res.cls, lbl = '', html = '';

      if (t.needsContext) {
        if (res.action === 'context') {
          if (res.level === 0) {
            lbl = '✓ Richtig: Kontext-Problem erkannt';
            html = '<strong>Genau.</strong> ' + t.lesson + ' Ausgegeben: nur <strong>' + fmtTok(spent) + '</strong>.';
          } else {
            lbl = 'Richtig — aber spät erkannt';
            html = '<strong>Kontext war das Problem</strong> — und das stand schon in der ersten Antwort. ' +
              'Die Eskalation hat <strong>' + fmtTok(spent - cumTok(0)) + '</strong> verbrannt, ohne etwas zu ändern.';
          }
        } else {
          lbl = 'Vermutung akzeptiert';
          html = '<strong>Das ist Raten, kein Wissen.</strong> Auch „Hoch“ kommt nur auf ' +
            t.quality[LEVELS.length - 1] + ' %. ' + t.lesson;
        }
      } else if (res.action === 'context') {
        lbl = 'Falscher Hebel';
        html = '<strong>Dem Modell fehlte nichts.</strong> Es hatte alle Informationen — hier fehlte Denkzeit, nicht Kontext. ' + t.lesson;
      } else if (res.level === sweet) {
        lbl = '✓ Sweet-Spot getroffen';
        html = '<strong>Richtig geurteilt.</strong> „' + LEVELS[sweet].name + '“ ist die billigste Stufe über der ' +
          GOOD + '-%-Schwelle — <strong>' + fmtTok(spent) + '</strong> ausgegeben, nichts verschwendet. ' + t.lesson;
      } else if (res.level > sweet) {
        lbl = 'Zu weit eskaliert';
        html = '<strong>' + fmtTok(spent - cumTok(sweet)) + ' verbrannt.</strong> Schon „' + LEVELS[sweet].name +
          '“ war mit ' + t.quality[sweet] + ' % gut genug. ' + t.lesson;
      } else {
        lbl = 'Zu früh akzeptiert';
        html = '<strong>Nur ' + q + ' %.</strong> „' + LEVELS[sweet].name + '“ hätte ' + t.quality[sweet] +
          ' % geliefert. ' + t.lesson;
      }

      verdict.className = 'esc-verdict ' + cls;
      verdictLbl.textContent = lbl;
      verdictTxt.innerHTML = html;
      renderCurve(t);
    }

    function clsFor(t, action, lvl) {
      var sweet = sweetOf(t);
      if (t.needsContext) {
        if (action === 'context') return lvl === 0 ? 'ok' : 'over';
        return 'under';
      }
      if (action === 'context') return 'under';
      if (lvl === sweet) return 'ok';
      return lvl > sweet ? 'over' : 'under';
    }

    function decide(action) {
      if (locked) return;
      locked = true;
      var t = TASKS[activeTask];
      var res = { action: action, level: level, cls: clsFor(t, action, level) };
      results[activeTask] = res;

      escBtn.disabled = true;
      acceptBtn.disabled = true;
      ctxBtn.disabled = true;

      showVerdict(t, res);
      buildTasks();
      updateScore();
    }

    function escalate() {
      if (locked || level >= LEVELS.length - 1) return;
      level++;
      render();
    }

    acceptBtn.addEventListener('click', function () { decide('accept'); });
    ctxBtn.addEventListener('click', function () { decide('context'); });
    escBtn.addEventListener('click', escalate);
    resetBtn.addEventListener('click', function () {
      results = [];
      activeTask = 0;
      buildTasks();
      resetRun();
    });

    section.addEventListener('rolechange', function (e) {
      role = (e.detail && e.detail.role) || 'dev';
      TASKS = TASKS_BY_ROLE[role] || TASKS_BY_ROLE.dev;
      results = [];
      activeTask = 0;
      buildTasks();
      resetRun();
    });

    buildTasks();
    resetRun();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
