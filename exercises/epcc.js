/**
 * Exercise 4 — EPCC Saboteur
 * 5 turns, each with 3 choices. Wrong choices add bugs and/or token waste.
 * Phase strip shows ideal EPCC flow; user's choices score independently.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="EPCC-Saboteur"]');
  if (!section) return;

  // Phase strip definition — what phase user *should* be at, each turn
  var PHASE_STRIP = ['Explore', 'Plan', 'Code', 'Commit'];

  // Per turn: phase state visualization + narrative + 3 choices
  var TURNS_DEV = [
    {
      ideal: 'Explore',
      stripState: ['active', '', '', ''], // active / done / '' (upcoming) / skipped
      narrative: 'Aufgabe gestartet. 2 von 8 relevanten Dateien gelesen. <span class="mono" style="font-size: 14px;">tokenStore.ts</span> noch nicht gesichtet.',
      choices: [
        {
          action: 'CONTINUE EXPLORE',
          label: 'Weiter explorieren — Rest der Dateien lesen.',
          cost: '+1.5k tok',
          good: true,
          bugs: 0,
          tokens: 1500,
          feedback: 'Du liest tokenStore.ts und findest den Refresh-Code. Solide Basis — Phase 1 sauber.'
        },
        {
          action: 'ADVANCE → PLAN',
          label: 'Plan schreiben — du hast genug gesehen.',
          cost: '+800 tok · +1 Bug',
          good: false,
          bugs: 1,
          tokens: 800,
          feedback: 'Du planst ohne <span class="mono">tokenStore.ts</span> gesehen zu haben. Refresh-Edge-Case nicht im Plan. +1 Bug.'
        },
        {
          action: 'SKIP → CODE',
          label: 'Direkt anfangen zu coden.',
          cost: '+3k tok · +2 Bugs',
          good: false,
          bugs: 2,
          tokens: 3000,
          feedback: 'Du editierst auf gut Glück. <span class="mono">tokenStore.ts</span> überrascht dich mitten im Refactor — Refactor-Inkonsistenz. +2 Bugs.'
        }
      ]
    },
    {
      ideal: 'Plan',
      stripState: ['done', 'active', '', ''],
      narrative: 'Alle 8 Dateien durch. Du verstehst die Architektur. Plan ausstehend.',
      choices: [
        {
          action: 'STAY IN EXPLORE',
          label: 'Noch eine Runde — tertiäre Dateien checken.',
          cost: '+3.5k tok',
          good: false,
          bugs: 0,
          tokens: 3500,
          feedback: 'Tertiäre Dateien lesen sich gut — ändern aber nichts am Plan. Viele Tokens, kein Erkenntnisgewinn. Übersättigung.'
        },
        {
          action: 'ADVANCE → PLAN',
          label: 'Plan beginnen — Architektur skizzieren.',
          cost: '+1.5k tok',
          good: true,
          bugs: 0,
          tokens: 1500,
          feedback: 'Saubere Übergabe. Du dokumentierst Refresh-Strategie inkl. Grace-Period. EPCC im Takt.'
        },
        {
          action: 'SKIP → CODE',
          label: 'Code direkt — der Plan ist im Kopf.',
          cost: '+2.5k tok · +1 Bug',
          good: false,
          bugs: 1,
          tokens: 2500,
          feedback: 'Implicit Plan ist kein Plan. Refresh-Race-Condition wird beim ersten Test sichtbar. +1 Bug.'
        }
      ]
    },
    {
      ideal: 'Plan',
      stripState: ['done', 'active', '', ''],
      narrative: 'Plan zu 60% fertig. Offen: Refresh-Strategie für <em>expired</em> Tokens — sofort refreshen oder mit Grace-Period?',
      choices: [
        {
          action: 'STAY IN PLAN',
          label: 'Plan zu Ende denken — Grace-Period klären.',
          cost: '+1k tok',
          good: true,
          bugs: 0,
          tokens: 1000,
          feedback: 'Du legst „Refresh-on-expire + 30s Grace" explizit fest. Saubere Architektur-Entscheidung dokumentiert.'
        },
        {
          action: 'ADVANCE → CODE',
          label: 'Code starten — Plan ist gut genug.',
          cost: '+2k tok · +1 Bug',
          good: false,
          bugs: 1,
          tokens: 2000,
          feedback: 'Grace-Period nicht festgelegt → im Code rate-limit-Loop. Test bricht. +1 Bug.'
        },
        {
          action: 'SKIP → COMMIT',
          label: 'Direkt zum Commit springen.',
          cost: '+0.5k tok · +2 Bugs',
          good: false,
          bugs: 2,
          tokens: 500,
          feedback: 'Es gibt keinen Code. Du springst zurück — aber zwei Disziplin-Marker. +2 Bugs.'
        }
      ]
    },
    {
      ideal: 'Code',
      stripState: ['done', 'done', 'active', ''],
      narrative: 'Plan vollständig. Refresh-Strategie inkl. Grace-Period dokumentiert. Bereit zur Implementation.',
      choices: [
        {
          action: 'STAY IN PLAN',
          label: 'Noch eine Runde Plan-Review.',
          cost: '+3k tok',
          good: false,
          bugs: 0,
          tokens: 3000,
          feedback: 'Plan wird marginal besser, große Token-Investition. Klassische Analyse-Lähmung.'
        },
        {
          action: 'ADVANCE → CODE',
          label: 'Code schreiben — gemäß Plan.',
          cost: '+2.5k tok',
          good: true,
          bugs: 0,
          tokens: 2500,
          feedback: 'Implementation läuft mit dem Plan im Rücken. Tests grün beim ersten Versuch.'
        },
        {
          action: 'SKIP → COMMIT',
          label: 'Commit — ohne Code.',
          cost: '+0.5k tok · +2 Bugs',
          good: false,
          bugs: 2,
          tokens: 500,
          feedback: 'Es gibt nichts zu committen. Großer Disziplin-Bruch. +2 Bugs.'
        }
      ]
    },
    {
      ideal: 'Commit',
      stripState: ['done', 'done', 'done', 'active'],
      narrative: 'Code geschrieben. Tests grün. Bereit für PR + Commit.',
      choices: [
        {
          action: 'STAY IN CODE',
          label: 'Manuell nachtesten — Bauchgefühl-Check.',
          cost: '+3k tok',
          good: false,
          bugs: 0,
          tokens: 3000,
          feedback: 'Manuell-Testen bei grünen automatischen Tests ist Beruhigung, kein Wert. Tokens verbrannt.'
        },
        {
          action: 'ADVANCE → COMMIT',
          label: 'Commit + PR-Beschreibung generieren.',
          cost: '+1.5k tok',
          good: true,
          bugs: 0,
          tokens: 1500,
          feedback: 'Sauberer Abschluss. PR generiert, Diff klar, Reviewer happy. EPCC durchgezogen.'
        },
        {
          action: 'SKIP REVIEW',
          label: 'Direkt mergen — kein PR-Review.',
          cost: '+0.5k tok · +1 Bug',
          good: false,
          bugs: 1,
          tokens: 500,
          feedback: 'Reviewer hätte einen Edge-Case gefangen. Kommt jetzt in Prod auf. +1 Bug.'
        }
      ]
    }
  ];

  // ---- Non-Dev framing: derselbe Ablauf, Business-Report statt Code ----
  var TURNS_NONDEV = [
    {
      ideal: 'Explore',
      stripState: ['active', '', '', ''],
      narrative: 'Aufgabe gestartet. 2 von 8 relevanten Dokumenten gesichtet. Die aktuelle <span class="mono" style="font-size: 14px;">Umsatztabelle</span> noch nicht geöffnet.',
      choices: [
        { action: 'CONTINUE EXPLORE', label: 'Weiter sichten — restliche Dokumente lesen.', cost: '+1.5k tok', good: true, bugs: 0, tokens: 1500, feedback: 'Du öffnest die Umsatztabelle und findest die Sonderbuchungen. Solide Basis — Phase 1 sauber.' },
        { action: 'ADVANCE → PLAN', label: 'Plan schreiben — du hast genug gesehen.', cost: '+800 tok · +1 Fehler', good: false, bugs: 1, tokens: 800, feedback: 'Du planst, ohne die <span class="mono">Umsatztabelle</span> gesehen zu haben. Die Sonderbuchungen fehlen im Plan. +1 Fehler.' },
        { action: 'SKIP → CODE', label: 'Direkt anfangen zu schreiben.', cost: '+3k tok · +2 Fehler', good: false, bugs: 2, tokens: 3000, feedback: 'Du schreibst auf gut Glück. Die <span class="mono">Sonderbuchungen</span> tauchen mitten im Entwurf auf — Zahlen widersprechen sich. +2 Fehler.' }
      ]
    },
    {
      ideal: 'Plan',
      stripState: ['done', 'active', '', ''],
      narrative: 'Alle 8 Dokumente durch. Du verstehst die Datenlage. Plan ausstehend.',
      choices: [
        { action: 'STAY IN EXPLORE', label: 'Noch eine Runde — Nebenquellen checken.', cost: '+3.5k tok', good: false, bugs: 0, tokens: 3500, feedback: 'Nebenquellen lesen sich gut — ändern aber nichts am Plan. Viele Tokens, kein Erkenntnisgewinn. Übersättigung.' },
        { action: 'ADVANCE → PLAN', label: 'Plan beginnen — Struktur skizzieren.', cost: '+1.5k tok', good: true, bugs: 0, tokens: 1500, feedback: 'Saubere Übergabe. Du dokumentierst die Gliederung inkl. Umgang mit den Sonderbuchungen. Methode im Takt.' },
        { action: 'SKIP → CODE', label: 'Schreiben direkt — der Plan ist im Kopf.', cost: '+2.5k tok · +1 Fehler', good: false, bugs: 1, tokens: 2500, feedback: 'Plan im Kopf ist kein Plan. Die Zahlen-Inkonsistenz wird beim ersten Gegenlesen sichtbar. +1 Fehler.' }
      ]
    },
    {
      ideal: 'Plan',
      stripState: ['done', 'active', '', ''],
      narrative: 'Plan zu 60% fertig. Offen: Umgang mit den <em>Sonderbuchungen</em> — herausrechnen oder separat ausweisen?',
      choices: [
        { action: 'STAY IN PLAN', label: 'Plan zu Ende denken — Sonderbuchungen klären.', cost: '+1k tok', good: true, bugs: 0, tokens: 1000, feedback: 'Du legst „separat ausweisen, mit Fußnote" explizit fest. Saubere Entscheidung dokumentiert.' },
        { action: 'ADVANCE → CODE', label: 'Schreiben starten — Plan ist gut genug.', cost: '+2k tok · +1 Fehler', good: false, bugs: 1, tokens: 2000, feedback: 'Umgang mit Sonderbuchungen nicht festgelegt → im Entwurf widersprüchliche Summen. Gegenlesen bricht ab. +1 Fehler.' },
        { action: 'SKIP → COMMIT', label: 'Direkt zur Abgabe springen.', cost: '+0.5k tok · +2 Fehler', good: false, bugs: 2, tokens: 500, feedback: 'Es gibt keinen Entwurf. Du springst zurück — aber zwei Disziplin-Marker. +2 Fehler.' }
      ]
    },
    {
      ideal: 'Code',
      stripState: ['done', 'done', 'active', ''],
      narrative: 'Plan vollständig. Umgang mit Sonderbuchungen inkl. Fußnote dokumentiert. Bereit zum Schreiben.',
      choices: [
        { action: 'STAY IN PLAN', label: 'Noch eine Runde Plan-Review.', cost: '+3k tok', good: false, bugs: 0, tokens: 3000, feedback: 'Plan wird marginal besser, große Token-Investition. Klassische Analyse-Lähmung.' },
        { action: 'ADVANCE → CODE', label: 'Bericht schreiben — gemäß Plan.', cost: '+2.5k tok', good: true, bugs: 0, tokens: 2500, feedback: 'Der Entwurf läuft mit dem Plan im Rücken. Gegenlesen grün beim ersten Versuch.' },
        { action: 'SKIP → COMMIT', label: 'Abgabe — ohne Entwurf.', cost: '+0.5k tok · +2 Fehler', good: false, bugs: 2, tokens: 500, feedback: 'Es gibt nichts abzugeben. Großer Disziplin-Bruch. +2 Fehler.' }
      ]
    },
    {
      ideal: 'Commit',
      stripState: ['done', 'done', 'done', 'active'],
      narrative: 'Bericht geschrieben. Gegenlesen grün. Bereit zur Abgabe + Freigabe.',
      choices: [
        { action: 'STAY IN CODE', label: 'Manuell nachrechnen — Bauchgefühl-Check.', cost: '+3k tok', good: false, bugs: 0, tokens: 3000, feedback: 'Nachrechnen bei sauberem Gegenlesen ist Beruhigung, kein Wert. Tokens verbrannt.' },
        { action: 'ADVANCE → COMMIT', label: 'Abgabe + Management-Summary generieren.', cost: '+1.5k tok', good: true, bugs: 0, tokens: 1500, feedback: 'Sauberer Abschluss. Summary erstellt, Änderungen klar, Freigeber happy. Methode durchgezogen.' },
        { action: 'SKIP REVIEW', label: 'Direkt verschicken — keine Freigabe.', cost: '+0.5k tok · +1 Fehler', good: false, bugs: 1, tokens: 500, feedback: 'Eine Freigabe hätte einen Zahlendreher gefangen. Geht jetzt so raus. +1 Fehler.' }
      ]
    }
  ];

  var role = 'dev';
  var TURNS = TURNS_DEV;
  function R(d, n) { return role === 'nondev' ? n : d; }

  var TOKEN_BUDGET = 60000;

  // ---- Elements ----
  var phasesEl = section.querySelector('#epcc-phases');
  var stateEl = section.querySelector('#epcc-state');
  var choicesEl = section.querySelector('#epcc-choices');
  var feedbackEl = section.querySelector('#epcc-feedback');
  var turnValEl = section.querySelector('#epcc-turn-val');
  var bugsEl = section.querySelector('#epcc-bugs');
  var tokensValEl = section.querySelector('#epcc-tokens-val');
  var tokenbarEl = section.querySelector('#epcc-tokenbar');
  var finaleEl = section.querySelector('#epcc-finale');
  var finaleBannerEl = section.querySelector('#epcc-finale-banner');
  var finaleMsgEl = section.querySelector('#epcc-finale-msg');
  var resetBtn = section.querySelector('#epcc-reset');

  // ---- State ----
  var state = { turn: 0, bugs: 0, tokens: 0, finished: false };

  function render() {
    var t = TURNS[state.turn] || TURNS[TURNS.length - 1];

    // Phase strip
    phasesEl.innerHTML = '';
    PHASE_STRIP.forEach(function (phaseName, i) {
      var s = state.finished ? '' : t.stripState[i];
      var div = document.createElement('div');
      div.className = 'epcc-phase' + (s ? ' ' + s : '');
      div.innerHTML =
        '<div class="ep-name">' + phaseName + '</div>' +
        '<div class="ep-tag">' + (s === 'active' ? '→ jetzt' : s === 'done' ? '✓ erledigt' : s === 'skipped' ? '⤵ übersprungen' : 'ausstehend') + '</div>';
      phasesEl.appendChild(div);
    });

    // State narrative
    stateEl.innerHTML =
      '<div class="es-turn"><span>Turn ' + Math.min(state.turn + 1, TURNS.length) + ' / ' + TURNS.length + '</span><span>Phase: ' + t.ideal + '</span></div>' +
      '<div class="es-narr">' + t.narrative + '</div>';

    // Choices
    choicesEl.innerHTML = '';
    if (!state.finished) {
      t.choices.forEach(function (c) {
        var btn = document.createElement('button');
        btn.className = 'epcc-choice';
        btn.innerHTML =
          '<div class="ec-action">' + c.action + '</div>' +
          '<div class="ec-label">' + c.label + '</div>' +
          '<div class="ec-cost">' + c.cost + '</div>';
        btn.addEventListener('click', function () { choose(c); });
        choicesEl.appendChild(btn);
      });
    } else {
      choicesEl.innerHTML = '';
    }

    // Counters
    turnValEl.textContent = Math.min(state.turn + (state.finished ? 0 : 1), TURNS.length) + ' / ' + TURNS.length;

    var bugDots = bugsEl.querySelectorAll('.epcc-bug-dot');
    bugDots.forEach(function (d, i) {
      if (i < state.bugs) {
        d.classList.add('on');
        d.textContent = '✗';
      } else {
        d.classList.remove('on');
        d.textContent = '○';
      }
    });

    tokensValEl.textContent = (state.tokens / 1000).toFixed(1) + 'k / 60k';
    var tokenPct = Math.min(100, (state.tokens / TOKEN_BUDGET) * 100);
    tokenbarEl.querySelector('div').style.width = tokenPct + '%';
    tokenbarEl.classList.remove('warn', 'bad');
    if (tokenPct >= 80) tokenbarEl.classList.add('bad');
    else if (tokenPct >= 60) tokenbarEl.classList.add('warn');

    tokensValEl.classList.remove('warn', 'bad');
    if (tokenPct >= 80) tokensValEl.classList.add('bad');
    else if (tokenPct >= 60) tokensValEl.classList.add('warn');
  }

  function choose(c) {
    state.bugs = Math.min(state.bugs + c.bugs, 5);
    state.tokens += c.tokens;
    feedbackEl.classList.remove('ok', 'bad');
    feedbackEl.classList.add(c.good ? 'ok' : 'bad');
    feedbackEl.innerHTML =
      '<div class="ef-label">' + (c.good ? '✓ Gute Wahl' : '⚠ Konsequenz') + '</div>' +
      '<div class="ef-text">' + c.feedback + '</div>';
    state.turn++;

    if (state.turn >= TURNS.length || state.bugs >= 3 || state.tokens >= TOKEN_BUDGET) {
      state.finished = true;
      showFinale();
    }
    render();
  }

  function showFinale() {
    var win = state.bugs <= 0 && state.tokens < TOKEN_BUDGET * 0.9;
    var partialWin = state.bugs === 1 && state.tokens < TOKEN_BUDGET;
    var fail = state.bugs >= 3 || state.tokens >= TOKEN_BUDGET;

    finaleEl.classList.remove('win', 'fail');
    if (win) {
      finaleEl.classList.add('win');
      finaleBannerEl.textContent = R('✓ Grüner Build', '✓ Bericht abgegeben');
      finaleMsgEl.innerHTML = R('EPCC sauber durchgezogen. Code stabil, kein Bug. Token-Budget effizient verwendet.', 'EPCC sauber durchgezogen. Bericht stimmig, kein Fehler. Token-Budget effizient verwendet.');
    } else if (partialWin) {
      finaleEl.classList.add('win');
      finaleBannerEl.textContent = R('◐ Build steht — mit Bug', '◐ Bericht steht — mit Fehler');
      finaleMsgEl.innerHTML = R('Ein Bug verbleibt. Hotfix nötig, aber kein Rebuild. EPCC fast vollständig respektiert.', 'Ein Fehler verbleibt. Korrektur nötig, aber keine Neufassung. EPCC fast vollständig respektiert.');
    } else if (fail) {
      finaleEl.classList.add('fail');
      finaleBannerEl.textContent = R('✗ Build kaputt', '✗ Bericht unbrauchbar');
      finaleMsgEl.innerHTML = R('Drei Bugs — Sprint verloren. Hätte mit EPCC-Disziplin nicht passieren müssen.', 'Drei Fehler — Bericht muss neu. Hätte mit EPCC-Disziplin nicht passieren müssen.');
    } else {
      finaleEl.classList.add('fail');
      finaleBannerEl.textContent = R('⚠ Instabil', '⚠ Wackelig');
      finaleMsgEl.innerHTML = R('Build kompiliert, aber Token-Burn und Bug-Akkumulation hinterlassen Spuren.', 'Bericht steht, aber Token-Burn und Fehler-Akkumulation hinterlassen Spuren.');
    }
    finaleEl.classList.add('show');
  }

  resetBtn.addEventListener('click', function () {
    state = { turn: 0, bugs: 0, tokens: 0, finished: false };
    finaleEl.classList.remove('show');
    feedbackEl.classList.remove('ok', 'bad');
    feedbackEl.innerHTML =
      '<div class="ef-label">Nächster Schritt</div>' +
      '<div class="ef-text">Wähle eine Option. Es gibt nicht <em>die</em> richtige — aber Konsequenzen.</div>';
    render();
  });

  section.addEventListener('rolechange', function (e) {
    role = e.detail.role;
    TURNS = (role === 'nondev') ? TURNS_NONDEV : TURNS_DEV;
    state = { turn: 0, bugs: 0, tokens: 0, finished: false };
    finaleEl.classList.remove('show');
    feedbackEl.classList.remove('ok', 'bad');
    feedbackEl.innerHTML =
      '<div class="ef-label">Nächster Schritt</div>' +
      '<div class="ef-text">Wähle eine Option. Es gibt nicht <em>die</em> richtige — aber Konsequenzen.</div>';
    render();
  });

  render();
})();
