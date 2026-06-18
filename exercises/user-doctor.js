/**
 * Exercise 2b — User-Prompt Doctor
 * Given a fixed Agent (system prompt) — and a set of on-demand Skills —
 * write THIS turn's user prompt so it triggers the RIGHT tool and stays
 * clear & minimal.
 *
 * New dimension (task picker): each task is solved by a different capability —
 *   AGENT        → the standing agent can do it directly; just state the task.
 *   SKILL        → trigger the on-demand skill; don't re-explain its body.
 *   AGENT+SKILL  → frame the agent's part AND trigger the skill; duplicate neither.
 * Traps duplicate either the Agent (always-on) or the Skill body.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="User-Prompt-Doctor"]');
  if (!section) return;

  // ---- shared standing setup per audience --------------------------------
  var AGENT_DEV = [
    'ROLLE → "Tech-Writer für REST-API-Doku"',
    'FORMAT → Markdown, ## je Endpunkt, ```bash cURL',
    'STIL → knapp, technisch, kein Marketing',
    'REGEL → keine Endpunkte erfinden, deprecated markieren'
  ];
  var AGENT_ND = [
    'ROLLE → "Referentin für interne Berichte"',
    'FORMAT → klare Überschrift, kurze Absätze, Aufzählungen',
    'STIL → knapp, sachlich, kein Marketing',
    'REGEL → keine Zahlen erfinden, Veraltetes markieren'
  ];
  var SKILL_CHANGELOG = {
    name: 'changelog-generator',
    items: [
      'Gruppiert nach feat / fix / breaking',
      'Markdown, ## je Gruppe, PR-Link je Eintrag',
      'Liest Commits zwischen zwei Git-Tags'
    ]
  };
  var SKILL_REPORT = {
    name: 'monats-report',
    items: [
      'Ist gegen Plan, je Abteilung',
      'Top-3-Abweichungen mit Kommentar',
      'Feste Gliederung + Kennzahlen-Tabelle'
    ]
  };

  var CAP_LABEL = {
    agent: 'Lösung · Agent',
    skill: 'Lösung · Skill',
    both:  'Lösung · Agent + Skill'
  };

  // ---- the tasks ----------------------------------------------------------
  var TASKS = {
    dev: [
      {
        id: 'd-readme',
        label: '/users/*-Endpunkt in der README dokumentieren',
        capability: 'agent',
        capWhy: 'Der <strong>Tech-Writer-Agent</strong> kann das direkt. Gib nur die konkrete Aufgabe + Quelle — Format & Stil stehen schon im System-Prompt.',
        goal: 'Adressat ist die <strong>öffentliche</strong> README — Quelle ist die OpenAPI-Spec im Repo.',
        out: '<span class="dbo-k">Was soll rauskommen =</span> GET/POST/PATCH/DELETE sauber dokumentiert, deprecated markiert.',
        agent: AGENT_DEV, skill: null,
        base: 'mach mir was zu unserer api', baseTokens: 8,
        fixes: [
          { id: 'task', name: 'Konkrete Aufgabe', meta: 'Was genau soll passieren?', label: 'AUFGABE',
            addition: 'Schreibe eine README-Section für die /users/* Endpunkte (GET, POST, PATCH, DELETE).', score: 1.8, tokens: 28 },
          { id: 'source', name: 'Quelle pinnen', meta: 'Wo steht die Wahrheit?', label: 'QUELLE',
            addition: 'Quelle: /docs/openapi.yaml im aktuellen Repo.', score: 1.5, tokens: 16 },
          { id: 'spec', name: 'Format überschreiben', meta: 'Spezialfall nur für diese Aufgabe', label: 'SPEC',
            addition: 'Diesmal zusätzlich: eine Übersichts-Tabelle ganz oben (Methode · Pfad · Zweck).', score: 1.0, tokens: 24 },
          { id: 'edge', name: 'Edge-Case-Regel', meta: 'Aufgaben-spezifischer Sonderfall', label: 'EDGE',
            addition: 'Endpunkte mit deprecated:true → NUR als Warnzeile, keine Details.', score: 1.0, tokens: 26 },
          { id: 'r-format', name: 'Antworte in Markdown', meta: '⚠ Bedenke den Agent', label: 'REDUNDANT',
            addition: 'Antworte bitte in Markdown.', score: 0, tokens: 8,
            redundant: true, redundantReason: 'Agent sagt schon: „Markdown mit ## je Endpunkt".' },
          { id: 'r-tone', name: 'Sei knapp und technisch', meta: '⚠ Bedenke den Agent', label: 'REDUNDANT',
            addition: 'Halte dich knapp und technisch, kein Marketing-Sprech.', score: 0, tokens: 14,
            redundant: true, redundantReason: 'Agent sagt schon: „knapp, technisch, kein Marketing".' }
        ]
      },
      {
        id: 'd-notes',
        label: 'Release-Notes für v2.4 erzeugen',
        capability: 'skill',
        capWhy: 'Dafür gibt es die Skill <strong>changelog-generator</strong>. <strong>Triggere sie</strong> — erkläre das Changelog-Format nicht selbst, das steht im Skill-Body.',
        goal: 'Ein <strong>Skill</strong> kann das — du musst ihn nur <strong>auslösen</strong>.',
        out: '<span class="dbo-k">Was soll rauskommen =</span> Changelog v2.3→v2.4, gruppiert, Breaking-Changes oben.',
        agent: AGENT_DEV, skill: SKILL_CHANGELOG,
        base: 'mach die release notes für 2.4', baseTokens: 9,
        fixes: [
          { id: 'trigger', name: 'Skill triggern', meta: 'Welche Skill, wofür?', label: 'TRIGGER', recommended: true,
            addition: 'Nutze die changelog-generator-Skill für die Release-Notes v2.4.', score: 2.0, tokens: 16 },
          { id: 'range', name: 'Range pinnen', meta: 'Welcher Ausschnitt diesmal?', label: 'RANGE',
            addition: 'Tag-Range: v2.3.0 … v2.4.0.', score: 1.5, tokens: 14 },
          { id: 'aud', name: 'Zielgruppe', meta: 'Für wen sind die Notes?', label: 'AUDIENCE',
            addition: 'Adressaten: externe Entwickler im Public-Repo — keine internen Ticket-IDs.', score: 1.2, tokens: 18 },
          { id: 'hi', name: 'Diesmal extra', meta: 'Akzent nur für diesen Turn', label: 'SPEC',
            addition: 'Breaking Changes diesmal ganz oben hervorheben.', score: 1.0, tokens: 16 },
          { id: 'r-skillbody', name: 'Changelog-Format vorgeben', meta: '⚠ Bedenke die Skill', label: 'REDUNDANT',
            addition: 'Gruppiere nach feat/fix/breaking, je Eintrag mit PR-Link und Emoji-Header.', score: 0, tokens: 22,
            redundant: true, redundantReason: 'Macht die changelog-generator-Skill schon — Body, nicht User-Prompt.' },
          { id: 'r-tone', name: 'Sei knapp und technisch', meta: '⚠ Bedenke den Agent', label: 'REDUNDANT',
            addition: 'Halte dich knapp und technisch, kein Marketing-Sprech.', score: 0, tokens: 14,
            redundant: true, redundantReason: 'Agent sagt schon: „knapp, technisch, kein Marketing".' }
        ]
      },
      {
        id: 'd-both',
        label: 'Migration-Guide v2→v3 + Release-Notes',
        capability: 'both',
        capWhy: 'Den <strong>Migration-Guide</strong> schreibt der Agent; die <strong>Release-Notes</strong> liefert die Skill. Dein Prompt rahmt beides — ohne eins davon zu duplizieren.',
        goal: 'Die <strong>Release-Notes</strong> sollen als <strong>Anhang</strong> unter den Guide.',
        out: '<span class="dbo-k">Was soll rauskommen =</span> Guide (Breaking Changes, Vorher/Nachher) + angehängte Notes.',
        agent: AGENT_DEV, skill: SKILL_CHANGELOG,
        base: 'schreib was zum v3 upgrade', baseTokens: 8,
        fixes: [
          { id: 'guide', name: 'Agent-Aufgabe', meta: 'Was schreibt der Agent?', label: 'GUIDE',
            addition: 'Schreibe den Migration-Guide v2→v3: Breaking Changes mit Vorher/Nachher-Snippets.', score: 1.8, tokens: 26 },
          { id: 'trigger', name: 'Skill triggern', meta: 'Was übernimmt die Skill?', label: 'TRIGGER', recommended: true,
            addition: 'Hänge die Release-Notes an — via changelog-generator, Range v2.4.0…v3.0.0.', score: 1.6, tokens: 20 },
          { id: 'source', name: 'Quelle pinnen', meta: 'Wo steht die Wahrheit?', label: 'QUELLE',
            addition: 'Quelle: /docs/openapi.yaml + die Git-Tags.', score: 1.2, tokens: 14 },
          { id: 'order', name: 'Reihenfolge', meta: 'Wie wird zusammengesetzt?', label: 'SPEC',
            addition: 'Erst der Guide, dann die Notes als Anhang darunter.', score: 1.0, tokens: 14 },
          { id: 'r-format', name: 'Antworte in Markdown', meta: '⚠ Bedenke den Agent', label: 'REDUNDANT',
            addition: 'Antworte bitte in Markdown.', score: 0, tokens: 8,
            redundant: true, redundantReason: 'Agent sagt schon: „Markdown mit ## je Endpunkt".' },
          { id: 'r-skillbody', name: 'Changelog-Format vorgeben', meta: '⚠ Bedenke die Skill', label: 'REDUNDANT',
            addition: 'Gruppiere die Notes nach feat/fix/breaking, je Eintrag mit PR-Link.', score: 0, tokens: 20,
            redundant: true, redundantReason: 'Macht die changelog-generator-Skill — nicht hier wiederholen.' }
        ]
      }
    ],
    nondev: [
      {
        id: 'n-status',
        label: 'Quartals-Status für den Q3-Report',
        capability: 'agent',
        capWhy: 'Die <strong>Referentin (Agent)</strong> kann das direkt. Gib nur die konkrete Aufgabe + Quelle — Format & Stil stehen schon im System-Prompt.',
        goal: 'Quelle ist die <strong>Controlling-Tabelle</strong> Q3.',
        out: '<span class="dbo-k">Was soll rauskommen =</span> Umsatz/Kosten/Marge/Ausblick zusammengefasst, Vorläufiges markiert.',
        agent: AGENT_ND, skill: null,
        base: 'mach mir was zu unserem report', baseTokens: 8,
        fixes: [
          { id: 'task', name: 'Konkrete Aufgabe', meta: 'Was genau soll passieren?', label: 'AUFGABE',
            addition: 'Schreibe den Statusabschnitt für die vier Quartalskennzahlen (Umsatz, Kosten, Marge, Ausblick).', score: 1.8, tokens: 28 },
          { id: 'source', name: 'Quelle pinnen', meta: 'Wo steht die Wahrheit?', label: 'QUELLE',
            addition: 'Quelle: die Controlling-Tabelle Q3 im aktuellen Ordner.', score: 1.5, tokens: 16 },
          { id: 'spec', name: 'Format überschreiben', meta: 'Spezialfall nur für diese Aufgabe', label: 'SPEC',
            addition: 'Diesmal zusätzlich: eine Übersichts-Tabelle ganz oben (Kennzahl · Wert · Trend).', score: 1.0, tokens: 24 },
          { id: 'edge', name: 'Edge-Case-Regel', meta: 'Aufgaben-spezifischer Sonderfall', label: 'EDGE',
            addition: 'Kennzahlen mit Status „vorläufig" → NUR als Warnzeile, keine Details.', score: 1.0, tokens: 26 },
          { id: 'r-format', name: 'Mit Überschrift formatieren', meta: '⚠ Bedenke den Agent', label: 'REDUNDANT',
            addition: 'Bitte mit Überschrift und Absätzen formatieren.', score: 0, tokens: 8,
            redundant: true, redundantReason: 'Agent sagt schon: „klare Überschrift, kurze Absätze".' },
          { id: 'r-tone', name: 'Sei knapp und sachlich', meta: '⚠ Bedenke den Agent', label: 'REDUNDANT',
            addition: 'Halte dich knapp und sachlich, kein Marketing-Sprech.', score: 0, tokens: 14,
            redundant: true, redundantReason: 'Agent sagt schon: „knapp, sachlich, kein Marketing".' }
        ]
      },
      {
        id: 'n-report',
        label: 'Monats-Report September erstellen',
        capability: 'skill',
        capWhy: 'Dafür gibt es die Skill <strong>monats-report</strong>. <strong>Triggere sie</strong> — beschreibe den Berichtsaufbau nicht selbst, der steht im Skill-Body.',
        goal: 'Ein <strong>Skill</strong> kann das — du musst ihn nur <strong>auslösen</strong>.',
        out: '<span class="dbo-k">Was soll rauskommen =</span> Monatsbericht September, Ist-gegen-Plan, Top-3-Abweichungen.',
        agent: AGENT_ND, skill: SKILL_REPORT,
        base: 'mach den report für september', baseTokens: 8,
        fixes: [
          { id: 'trigger', name: 'Skill triggern', meta: 'Welche Skill, wofür?', label: 'TRIGGER', recommended: true,
            addition: 'Nutze die monats-report-Skill für den September-Bericht.', score: 2.0, tokens: 16 },
          { id: 'period', name: 'Zeitraum pinnen', meta: 'Welcher Ausschnitt diesmal?', label: 'ZEITRAUM',
            addition: 'Zeitraum: September 2026, Vormonat als Vergleich.', score: 1.5, tokens: 14 },
          { id: 'aud', name: 'Adressat', meta: 'Für wen ist der Bericht?', label: 'AUDIENCE',
            addition: 'Adressat: Geschäftsführung — nur die Top-Abweichungen kommentieren.', score: 1.2, tokens: 18 },
          { id: 'hi', name: 'Diesmal extra', meta: 'Akzent nur für diesen Turn', label: 'SPEC',
            addition: 'Marge-Einbruch im Vertrieb diesmal ganz oben hervorheben.', score: 1.0, tokens: 16 },
          { id: 'r-skillbody', name: 'Berichtsaufbau vorgeben', meta: '⚠ Bedenke die Skill', label: 'REDUNDANT',
            addition: 'Gliederung: Ist-gegen-Plan je Abteilung, dann Top-3-Abweichungen mit Kommentar.', score: 0, tokens: 22,
            redundant: true, redundantReason: 'Macht die monats-report-Skill schon — Body, nicht User-Prompt.' },
          { id: 'r-tone', name: 'Sei knapp und sachlich', meta: '⚠ Bedenke den Agent', label: 'REDUNDANT',
            addition: 'Halte dich knapp und sachlich, kein Marketing-Sprech.', score: 0, tokens: 14,
            redundant: true, redundantReason: 'Agent sagt schon: „knapp, sachlich, kein Marketing".' }
        ]
      },
      {
        id: 'n-both',
        label: 'Anschreiben an die Geschäftsführung + Report',
        capability: 'both',
        capWhy: 'Das <strong>Anschreiben</strong> verfasst die Referentin (Agent); den <strong>Monats-Report</strong> liefert die Skill. Dein Prompt rahmt beides — ohne eins davon zu duplizieren.',
        goal: 'Der <strong>Monats-Report</strong> soll als <strong>Anlage</strong> ans Anschreiben.',
        out: '<span class="dbo-k">Was soll rauskommen =</span> kurzes Anschreiben + angehängter September-Report.',
        agent: AGENT_ND, skill: SKILL_REPORT,
        base: 'schreib was an die geschäftsführung', baseTokens: 7,
        fixes: [
          { id: 'letter', name: 'Agent-Aufgabe', meta: 'Was schreibt der Agent?', label: 'BRIEF',
            addition: 'Verfasse das Anschreiben an die Geschäftsführung: Kontext + Bitte um Freigabe, halbe Seite.', score: 1.8, tokens: 26 },
          { id: 'trigger', name: 'Skill triggern', meta: 'Was übernimmt die Skill?', label: 'TRIGGER', recommended: true,
            addition: 'Lege den Monats-Report bei — via monats-report, September.', score: 1.6, tokens: 20 },
          { id: 'source', name: 'Quelle pinnen', meta: 'Wo steht die Wahrheit?', label: 'QUELLE',
            addition: 'Quelle: die Controlling-Tabelle September.', score: 1.2, tokens: 14 },
          { id: 'order', name: 'Reihenfolge', meta: 'Wie wird zusammengesetzt?', label: 'SPEC',
            addition: 'Erst das Anschreiben, dann der Report als Anlage darunter.', score: 1.0, tokens: 14 },
          { id: 'r-format', name: 'Mit Überschrift formatieren', meta: '⚠ Bedenke den Agent', label: 'REDUNDANT',
            addition: 'Bitte mit Überschrift und Absätzen formatieren.', score: 0, tokens: 8,
            redundant: true, redundantReason: 'Agent sagt schon: „klare Überschrift, kurze Absätze".' },
          { id: 'r-skillbody', name: 'Berichtsaufbau vorgeben', meta: '⚠ Bedenke die Skill', label: 'REDUNDANT',
            addition: 'Gliedere den Report nach Abteilung, dann Top-3-Abweichungen.', score: 0, tokens: 20,
            redundant: true, redundantReason: 'Macht die monats-report-Skill — nicht hier wiederholen.' }
        ]
      }
    ]
  };

  // ---- elements ----------------------------------------------------------
  var ddEl = section.querySelector('#userdoc-dd');
  var triggerEl = section.querySelector('#userdoc-trigger');
  var triggerTextEl = section.querySelector('#userdoc-trigger-text');
  var menuEl = section.querySelector('#userdoc-menu');
  var briefEl = section.querySelector('#userdoc-brief');
  var sysBlock = section.querySelector('#userdoc-system');
  var textEl = section.querySelector('#userdoc-text');
  var charcountEl = section.querySelector('#userdoc-charcount');
  var scoreEl = section.querySelector('#userdoc-score');
  var scoreBar = section.querySelector('#userdoc-score-bar');
  var overspecEl = section.querySelector('#userdoc-overspec');
  var optimalEl = section.querySelector('#userdoc-optimal');
  var scoreNoteEl = section.querySelector('#userdoc-scorenote');
  var tokensEl = section.querySelector('#userdoc-tokens');
  var tokensBar = section.querySelector('#userdoc-tokens-bar');
  var redundantEl = section.querySelector('#userdoc-redundant');
  var fixesListEl = section.querySelector('#userdoc-fixes-list');
  var activeCountEl = section.querySelector('#userdoc-active-count');
  var sweetEl = section.querySelector('#userdoc-sweet');
  var resetBtn = section.querySelector('#userdoc-reset');
  var solveBtn = section.querySelector('#userdoc-solve');

  var role = 'dev';
  var taskIdx = 0;
  var state = {};
  var revealed = false;

  function tasks() { return TASKS[role === 'nondev' ? 'nondev' : 'dev']; }
  function task() { return tasks()[taskIdx]; }

  function resetState() {
    state = {};
    task().fixes.forEach(function (f) { state[f.id] = false; });
  }

  function populateTasks() {
    var list = tasks();
    var cur = list[taskIdx];
    triggerTextEl.textContent = cur ? (taskIdx + 1) + ' · ' + cur.label : '— Aufgabe wählen —';
    triggerEl.classList.toggle('is-placeholder', !cur);
    menuEl.innerHTML = list.map(function (t, i) {
      var isSel = i === taskIdx;
      return '<button type="button" class="cgp-option' + (isSel ? ' is-selected' : '') +
        '" role="option" aria-selected="' + (isSel ? 'true' : 'false') + '" data-idx="' + i + '">' +
        '<span class="cgp-opt-text">' + (i + 1) + ' · ' + escapeHtml(t.label) + '</span>' +
        '<span class="cgp-opt-check" aria-hidden="true"></span>' +
        '</button>';
    }).join('');
  }

  // ---- dropdown open/close ----
  function openMenu() {
    menuEl.hidden = false;
    ddEl.classList.add('open');
    triggerEl.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    if (menuEl.hidden) return;
    menuEl.hidden = true;
    ddEl.classList.remove('open');
    triggerEl.setAttribute('aria-expanded', 'false');
  }
  triggerEl.addEventListener('click', function (e) {
    e.stopPropagation();
    if (menuEl.hidden) openMenu(); else closeMenu();
  });
  menuEl.addEventListener('click', function (e) {
    var opt = e.target.closest('.cgp-option');
    if (!opt) return;
    closeMenu();
    selectTask(parseInt(opt.getAttribute('data-idx'), 10) || 0);
  });
  document.addEventListener('click', function (e) {
    if (!ddEl.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  function renderBrief() {
    var t = task();
    var headHtml = revealed
      ? '<div class="doctor-brief-head"><span class="ud-cap ' + t.capability + '">' + CAP_LABEL[t.capability] + '</span></div>'
      : '';
    var capWhyHtml = revealed ? '<div class="ud-capwhy">→ ' + t.capWhy + '</div>' : '';
    briefEl.innerHTML =
      headHtml +
      '<div class="doctor-brief-goal">' + t.goal + '</div>' +
      '<div class="doctor-brief-out">' + t.out + '</div>' +
      capWhyHtml;
  }

  function renderSystem() {
    var t = task();
    var agentName = t.agent === AGENT_DEV ? 'Tech-Writer-Agent' : 'Referentin (Agent)';
    var agentList = '<ul class="userdoc-system-list">' +
      t.agent.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>';
    var html =
      '<div class="userdoc-system-head">Im Chat verfügbar</div>' +
      '<div class="uds-cols' + (t.skill ? ' two' : '') + '">' +
        '<div class="uds-col agent">' +
          '<div class="uds-col-head agent">' + agentName + '</div>' +
          agentList +
        '</div>';
    if (t.skill) {
      html +=
        '<div class="uds-col skill">' +
          '<div class="uds-col-head skill">' + t.skill.name + ' Skill</div>' +
          '<ul class="userdoc-system-list">' +
            t.skill.items.map(function (s) { return '<li>' + s + '</li>'; }).join('') +
          '</ul>' +
        '</div>';
    }
    html += '</div>';
    sysBlock.innerHTML = html;
  }

  function render() {
    var t = task();
    renderBrief();
    renderSystem();
    if (solveBtn) solveBtn.textContent = revealed ? 'Bearbeiten' : 'Prüfen';

    var anyFixed = t.fixes.some(function (f) { return state[f.id]; });

    // Prompt preview
    var lines = [];
    lines.push('<div class="doctor-line base' + (anyFixed ? ' fixed' : '') + '">' + escapeHtml(t.base) + '</div>');
    t.fixes.forEach(function (f) {
      if (state[f.id]) {
        var showWarn = revealed && f.redundant;
        var labelStyle = showWarn ? ' style="color: var(--warn);"' : '';
        lines.push('<div class="doctor-line label"' + labelStyle + '>' + f.label + (showWarn ? ' ⚠' : '') + '</div>');
        lines.push('<div class="doctor-line added"' + (showWarn ? ' style="border-left-color: var(--warn); background: rgba(184,132,31,0.10);"' : '') + '>' + escapeHtml(f.addition) + '</div>');
      }
    });
    textEl.innerHTML = lines.join('');

    // Fix list
    fixesListEl.innerHTML = '';
    t.fixes.forEach(function (f) {
      var on = state[f.id];
      var div = document.createElement('div');
      div.className = 'doctor-fix' + (on ? ' on' : '') + (revealed && f.redundant ? ' redundant' : '') + (revealed && !f.redundant ? ' recommended' : '');
      var scoreStr = f.score > 0 ? '+ ' + f.score.toFixed(1) + ' Score' : (f.redundant ? '+ 0 (redundant!)' : '+ 0 Score');
      var badge = '';
      if (revealed && f.redundant) badge = ' <span style="color: var(--warn); font-family: var(--mono); font-size: 10px;">·  ⚠ TRAP</span>';
      else if (revealed && f.recommended) badge = ' <span style="color: var(--ok); font-family: var(--mono); font-size: 10px;">· ✓ EMPFOHLEN</span>';
      else if (revealed) badge = ' <span style="color: var(--ok); font-family: var(--mono); font-size: 10px;">· ✓ sinnvoll</span>';
      var displayMeta = (!revealed && f.redundant) ? 'Zusätzliche Anweisung' : f.meta;
      div.innerHTML =
        '<div class="doctor-fix-head">' +
          '<div class="doctor-fix-name">' + f.name + badge +
          '</div>' +
          '<div class="doctor-fix-check">' + (on ? '✓' : '') + '</div>' +
        '</div>' +
        '<div style="font-size: 12px; color: #c8c2b6; margin-bottom: 6px;">' + displayMeta + '</div>' +
        '<div class="doctor-fix-meta">' +
          (revealed ? '<span class="' + (f.score > 0 ? 'qm-up' : '') + '" ' + (f.redundant ? 'style="color: var(--warn);"' : '') + '>' + scoreStr + '</span>' : '') +
          '<span>+ ' + f.tokens + ' tok</span>' +
        '</div>' +
        ((revealed && f.redundant) ? '<div class="doctor-fix-note"><strong>Warum Trap:</strong> ' + f.redundantReason + '</div>' : '');
      div.addEventListener('click', function () {
        state[f.id] = !state[f.id];
        render();
      });
      fixesListEl.appendChild(div);
    });

    // Meters
    var score = 1.0;
    var tokens = t.baseTokens;
    var activeCount = 0;
    var redundantOn = [];
    t.fixes.forEach(function (f) {
      if (state[f.id]) {
        score += f.score; tokens += f.tokens; activeCount++;
        if (f.redundant) redundantOn.push(f);
      }
    });
    score = Math.min(10, score);

    // Erreichbares Optimum = Basis + alle SINNVOLLEN Bausteine (Traps zaehlen 0).
    // Alles darueber ist nur durch Ueberspezifizieren "erreichbar" — bewusst gesperrt.
    var optimum = 1.0;
    t.fixes.forEach(function (f) { if (!f.redundant) optimum += f.score; });
    optimum = Math.min(10, optimum);

    scoreEl.classList.remove('ok', 'warn', 'bad');

    if (revealed) {
      // Loesung sichtbar: Optimum-Zahl, Marker, Geisterzone, Badge.
      scoreBar.style.width = (score * 10) + '%';
      if (score >= 6) scoreEl.classList.add('ok');
      else if (score >= 4) scoreEl.classList.add('warn');
      else scoreEl.classList.add('bad');
      var optPct = optimum * 10;
      optimalEl.style.left = optPct + '%';
      overspecEl.style.left = optPct + '%';
      optimalEl.style.display = '';
      overspecEl.style.display = '';
      var tag = score >= 6 ? ' <span class="dm-tag">optimal</span>' : '';
      scoreEl.innerHTML = score.toFixed(1) + ' <span class="dm-max">/ 10</span>' + tag;
      scoreNoteEl.innerHTML = 'Optimal ≈ ' + optimum.toFixed(1) + ' · über die <span style="border-bottom:1px dashed var(--ink-3);">schraffierte Zone</span> kämst du nur, indem du dem Agent alles haarklein vorgibst — Tokens ohne Mehrwert.';
    } else {
      // Vor dem Auflösen: keine Loesung verraten — Score bleibt verdeckt.
      scoreBar.style.width = '0%';
      optimalEl.style.display = 'none';
      overspecEl.style.display = 'none';
      scoreEl.innerHTML = '? <span class="dm-max">/ 10</span>';
      scoreNoteEl.innerHTML = '';
    }

    tokensEl.textContent = '~' + tokens + ' tok';
    var pct = Math.min(100, (tokens / 200) * 100);
    tokensBar.style.width = pct + '%';
    tokensBar.parentNode.classList.remove('warn', 'bad');
    tokensEl.classList.remove('ok', 'warn', 'bad');
    if (tokens > 130) { tokensBar.parentNode.classList.add('bad'); tokensEl.classList.add('bad'); }
    else if (tokens > 80) { tokensBar.parentNode.classList.add('warn'); tokensEl.classList.add('warn'); }
    else { tokensEl.classList.add('ok'); }

    if (!revealed) {
      redundantEl.classList.remove('hit');
      redundantEl.innerHTML = '— wähle Fixes, dann <strong>Prüfen</strong><br/><span style="font-size: 11px; opacity: 0.7;">Prüft, ob du etwas wiederholst, das Agent/Skill schon können.</span>';
    } else if (redundantOn.length > 0) {
      redundantEl.classList.add('hit');
      redundantEl.innerHTML = '⚠ ' + redundantOn.length + ' redundant<br/>' +
        '<span style="font-size: 11px; opacity: 0.85;">' + redundantOn[0].redundantReason + '</span>';
    } else {
      redundantEl.classList.remove('hit');
      redundantEl.innerHTML = '✓ keine Duplikate<br/><span style="font-size: 11px; opacity: 0.7;">Triggert nur, was Agent/Skill noch nicht abdecken.</span>';
    }

    activeCountEl.textContent = activeCount + ' von ' + t.fixes.length + ' aktiv';
    if (!revealed) {
      sweetEl.classList.remove('hit');
      sweetEl.innerHTML = '';
    } else {
      var inSweet = score >= 6 && tokens <= 120 && redundantOn.length === 0;
      if (inSweet) {
        sweetEl.classList.add('hit');
        sweetEl.innerHTML = '✓ <span style="color: #fff;">Optimal getroffen!</span> Score ' + score.toFixed(1) + ', ' + tokens + ' tok, kein Duplikat';
      } else {
        sweetEl.classList.remove('hit');
        if (redundantOn.length > 0) {
          sweetEl.innerHTML = 'Redundant zu Agent/Skill — kostet Tokens ohne Nutzen';
        } else if (score < 6) {
          sweetEl.textContent = 'Score noch zu niedrig (' + score.toFixed(1) + ' < 6)';
        } else if (tokens > 120) {
          sweetEl.textContent = 'User-Prompt zu lang (' + tokens + ' > 120 tok)';
        } else {
          sweetEl.innerHTML = '— Schalte sinnvolle Fixes an, meide Traps';
        }
      }
    }

  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function selectTask(i) {
    taskIdx = i;
    revealed = false;
    populateTasks();
    resetState();
    render();
  }

  resetBtn.addEventListener('click', function () { revealed = false; resetState(); render(); });

  solveBtn.addEventListener('click', function () {
    // Prüfen = die EIGENE Auswahl bewerten (nicht überschreiben). Erneut: zurück zum Bearbeiten.
    revealed = !revealed;
    render();
  });

  section.addEventListener('rolechange', function (e) {
    role = e.detail.role;
    taskIdx = 0;
    revealed = false;
    populateTasks();
    resetState();
    render();
  });

  populateTasks();
  resetState();
  render();
})();
