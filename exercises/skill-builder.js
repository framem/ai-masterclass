/**
 * Exercise — Skill Builder (IDE view)
 * Same IDE pattern as Agent Builder, but emphasises token economics:
 * Skills are loaded on-demand vs putting it always-on in AGENTS.md.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="Skill-Builder"]');
  if (!section) return;

  // -------- Project files (existing — for context) --------
  var FILES = {
    'AGENTS.md': {
      content: '# AcmeSaaS — Team-Standards\n\n' +
               '## Tech-Stack\n- TypeScript + Node 20\n- Postgres 16\n\n' +
               '## Niemals\n- npm i --force\n- Secrets in Code\n- direkt auf main pushen\n\n' +
               '<!-- WICHTIG: Skills-spezifische Details NICHT hier — gehören in skills/ -->'
    },
    'mcp.json': {
      content: '{\n  "servers": {\n    "filesystem": { "active": true },\n    "github": { "active": true }\n  }\n}'
    },
    'skills/code-review/SKILL.md': {
      content: '---\ntrigger: when reviewing PR diffs\ntokens-when-loaded: 2400\n---\n\n' +
               '# Code-Review Skill\n\n' +
               'Wendet Team-Standards aus AGENTS.md an.\n\n' +
               '## Checks\n- ESLint-Verstöße\n- Fehlende Tests\n- Naming-Konventionen\n'
    },
    'skills/markdown-report/SKILL.md': {
      content: '---\ntrigger: when user requests "summary" or "weekly report"\ntokens-when-loaded: 1800\n---\n\n' +
               '# Markdown-Report Skill\n\n' +
               'Templates: weekly-report, incident-summary, sprint-recap.\n'
    },
    'docs/api.md': { content: '# API · /api/v1\n\nREST endpoints. Siehe openapi.yaml.\n' }
  };

  // -------- Scenarios — each one a new skill to create --------
  var SCENARIOS = [
    {
      id: 'pptx',
      tag: 'KONVERTIERUNG',
      name: 'PPTX-Export-Skill',
      desc: 'Markdown-Deck → editable PowerPoint. Selten gebraucht (5% der Chat-Nachrichten), aber inhaltlich schwer.',
      desc_nd: 'Präsentation aus einem Text-Entwurf → fertige PowerPoint. Selten gebraucht (5% der Chat-Nachrichten), aber aufwändig.',
      trigger: 'when user says "export as slides" or "save as pptx" or "make a deck"',
      files: [
        { path: 'skills/pptx-export/SKILL.md',         size: '1.2 kB', tokens: 1200 },
        { path: 'skills/pptx-export/template.pptx',    size: '850 B',  tokens: 0, isAsset: true },
        { path: 'skills/pptx-export/style-config.json', size: '320 B',  tokens: 320 }
      ],
      relevantFiles: ['skills/code-review/SKILL.md', 'skills/markdown-report/SKILL.md', 'AGENTS.md'],
      tokensLoaded: 1520,
      frequency: 0.05,
      callsPerMonth: 800,
      newContent: '---\nname: pptx-export\ntrigger: when user says "export as slides" / "save as pptx" / "make a deck"\ntokens-when-loaded: 1520\nbundle:\n  - template.pptx\n  - style-config.json\n---\n\n' +
                  '# PPTX-Export Skill\n\n' +
                  '## Wann lade ich\nAuf expliziter Anweisung des Nutzers zum Export.\n\n' +
                  '## Was tu ich\n1. Lese aktuellen Markdown-Stand.\n2. Mappe Headings → Slides, Listen → Bullet-Frames.\n3. Setze template.pptx als Vorlage.\n4. Wende style-config.json an (Schriften, Farben).\n5. Speichere als <name>.pptx, biete Download an.\n\n' +
                  '## Edge-Cases\n- Code-Blöcke: in Monospace-Frame, max 12 Zeilen pro Slide.\n- Bilder: kopier in /media/, referenzier relativ.\n',
      insight: 'PPTX-Wissen in <strong>AGENTS.md</strong> hätte 1520 tok × 800 Chat-Nachrichten/Monat = <strong>1.2M Tokens/Monat</strong> gekostet. Als Skill: 1520 × 40 Chat-Nachrichten = <strong>61k</strong>. <strong>20× weniger.</strong>'
    },
    {
      id: 'postmortem',
      tag: 'PROZESS',
      name: 'Incident-Postmortem-Skill',
      name_nd: 'Vorfall-Nachbereitung-Skill',
      desc: 'Strukturierte Post-Incident-Writeups. Selten — aber wenn, dann muss Format und Ton sitzen.',
      desc_nd: 'Strukturierte Nachbereitung nach einem Vorfall. Selten — aber wenn, dann muss Format und Ton sitzen.',
      trigger: 'when user starts "postmortem" or "incident writeup" or "RCA"',
      files: [
        { path: 'skills/postmortem/SKILL.md',  size: '900 B', tokens: 900 },
        { path: 'skills/postmortem/template.md', size: '1.6 kB', tokens: 1600 },
        { path: 'skills/postmortem/tone-examples.md', size: '600 B', tokens: 600 }
      ],
      relevantFiles: ['skills/markdown-report/SKILL.md', 'AGENTS.md'],
      tokensLoaded: 3100,
      frequency: 0.02,
      callsPerMonth: 800,
      newContent: '---\nname: postmortem\ntrigger: when user starts "postmortem" / "incident writeup" / "RCA"\ntokens-when-loaded: 3100\nbundle:\n  - template.md\n  - tone-examples.md\n---\n\n' +
                  '# Postmortem Skill\n\n' +
                  '## Wann lade ich\nWenn der Nutzer einen Postmortem startet.\n\n' +
                  '## Was tu ich\n1. Lade template.md (5 Sektionen: Summary · Timeline · Impact · Root Cause · Action Items).\n2. Lade tone-examples.md (blameless writing, „what" statt „who").\n3. Befüll iterativ mit dem Nutzer, eine Sektion nach der anderen.\n\n' +
                  '## Niemals\n- Personen-Namen außer im Sign-off.\n- „menschliches Versagen" als Root Cause.\n- Action Items ohne Owner + Datum.\n',
      insight: 'Tone-Examples sind 600 tok — für 2% der Chat-Nachrichten. Als always-on Bürde wäre der Style-Guide jeder Chat-Nachricht angehängt. <strong>Nicht skalierbar.</strong>'
    },
    {
      id: 'api-docs',
      tag: 'CONTEXT-AWARE',
      name: 'API-Docs-Skill',
      name_nd: 'Richtlinien-Doku-Skill',
      desc: 'Aktiviert sich, wenn der Pfad /docs/api/ betroffen ist. Verbindet Repo-Struktur mit Style-Regeln.',
      desc_nd: 'Aktiviert sich, wenn Richtlinien-Dokumente betroffen sind. Verbindet Ablage-Struktur mit Stil-Regeln.',
      trigger: 'when working in /docs/api/ OR user mentions "OpenAPI"',
      files: [
        { path: 'skills/api-docs/SKILL.md',         size: '1.1 kB', tokens: 1100 },
        { path: 'skills/api-docs/style-guide.md',   size: '2.2 kB', tokens: 2200 },
        { path: 'skills/api-docs/examples.md',      size: '1.8 kB', tokens: 1800 }
      ],
      relevantFiles: ['docs/api.md', 'AGENTS.md'],
      tokensLoaded: 5100,
      frequency: 0.15,
      callsPerMonth: 800,
      newContent: '---\nname: api-docs\ntrigger: when working in /docs/api/ or user mentions "OpenAPI"\ntokens-when-loaded: 5100\nbundle:\n  - style-guide.md\n  - examples.md\n---\n\n' +
                  '# API-Docs Skill\n\n' +
                  '## Wann lade ich\nWenn Pfade unter /docs/api/ angefasst werden — ODER bei expliziter API-Doku-Frage.\n\n' +
                  '## Was tu ich\n1. Lade style-guide.md: Heading-Pattern, cURL-Konventionen, Schema-Tabellen.\n2. Lade examples.md: 3 vollständige Beispiel-Endpunkte als Referenz.\n3. Schreibe NUR, was in openapi.yaml steht. Erfind nichts.\n\n' +
                  '## Output-Konventionen\n- ## METHODE /pfad — Heading-Pattern\n- Tabelle für Parameter (Name · Typ · Required · Beschreibung)\n- 1 cURL-Beispiel pro Endpunkt\n- Bei deprecated: ⚠ als erste Zeile\n',
      insight: '15% Trigger-Rate ist relativ hoch. Trotzdem 5100 tok × 120 Chat-Nachrichten = 612k statt 5100 × 800 = <strong>4M Tokens/Monat</strong>. Skill spart 85%.'
    }
  ];

  // -------- State --------
  var state = {
    selectedFile: null,
    selectedScenario: null,
    showGenerated: false
  };

  var role = 'dev';
  function G(o, k) { return (role === 'nondev' && o[k + '_nd'] !== undefined) ? o[k + '_nd'] : o[k]; }

  // -------- Elements --------
  var treeEl = section.querySelector('#skill-tree');
  var viewerTabEl = section.querySelector('#skill-viewer-tab');
  var viewerContentEl = section.querySelector('#skill-viewer-content');
  var scenariosEl = section.querySelector('#skill-scenarios');
  var analysisEl = section.querySelector('#skill-analysis');
  var insightEl = section.querySelector('#skill-insight');
  var createBtn = section.querySelector('#skill-create');
  var resetBtn = section.querySelector('#skill-reset');

  function renderTree() {
    var paths = Object.keys(FILES);
    var dirSet = {};
    paths.forEach(function (p) {
      var parts = p.split('/');
      for (var i = 1; i < parts.length; i++) {
        dirSet[parts.slice(0, i).join('/') + '/'] = true;
      }
    });
    var all = Object.keys(dirSet).concat(paths);

    // Add generated skill files
    if (state.showGenerated && state.selectedScenario) {
      state.selectedScenario.files.forEach(function (f) {
        if (all.indexOf(f.path) === -1) {
          var parts = f.path.split('/');
          for (var j = 1; j < parts.length; j++) {
            var dp = parts.slice(0, j).join('/') + '/';
            if (all.indexOf(dp) === -1) all.push(dp);
          }
          all.push(f.path);
        }
      });
    }
    all.sort();

    var relevant = state.selectedScenario ? state.selectedScenario.relevantFiles : [];
    var newFiles = (state.selectedScenario && state.showGenerated) ? state.selectedScenario.files.map(function (f) { return f.path; }) : [];

    treeEl.innerHTML = '';
    var rootRow = document.createElement('div');
    rootRow.className = 'ide-tree-row root';
    rootRow.innerHTML = '<span class="itr-icon">▼</span> my-saas-app';
    treeEl.appendChild(rootRow);

    all.forEach(function (path) {
      var isDir = path.endsWith('/');
      var depth = path.split('/').length - (isDir ? 1 : 0);
      var name = isDir ? path.split('/').slice(-2, -1)[0] + '/' : path.split('/').pop();
      var isRelevant = relevant.indexOf(path) !== -1;
      var isActive = state.selectedFile === path;
      var isNew = newFiles.indexOf(path) !== -1;

      var row = document.createElement('div');
      row.className = 'ide-tree-row' + (isDir ? ' dir' : '') + (isActive ? ' active' : '') + (isRelevant ? ' relevant' : '') + (isNew ? ' new' : '');
      row.style.paddingLeft = (10 + depth * 14) + 'px';
      var icon = isDir ? '▸' : (isNew ? '✦' : '·');
      row.innerHTML = '<span class="itr-icon">' + icon + '</span> ' + escapeHtml(name) + (isRelevant ? ' <span class="itr-tag">★</span>' : '');

      if (!isDir) {
        row.addEventListener('click', function () {
          state.selectedFile = path;
          renderTree();
          renderViewer();
        });
      }
      treeEl.appendChild(row);
    });
  }

  function renderViewer() {
    var path = state.selectedFile;
    if (!path && state.showGenerated && state.selectedScenario) {
      path = state.selectedScenario.files[0].path;
    }

    if (!path) {
      viewerTabEl.innerHTML = '<span style="color: var(--ink-3);">— kein File ausgewählt —</span>';
      viewerContentEl.innerHTML = '<div class="ide-viewer-empty">Klicke eine bestehende Skill links · oder wähle ein Szenario rechts → siehst, was eine neue Skill zum Repo addiert.</div>';
      return;
    }

    var fileContent;
    var isGenerated = false;
    if (state.showGenerated && state.selectedScenario) {
      var matched = state.selectedScenario.files.find(function (f) { return f.path === path; });
      if (matched) {
        isGenerated = true;
        if (path.endsWith('SKILL.md')) {
          fileContent = state.selectedScenario.newContent;
        } else if (matched.isAsset) {
          fileContent = '[binäre Datei · ' + matched.size + ']\n\n— wird vom Skill referenziert, nicht ins Context-Window geladen.';
        } else {
          fileContent = '# ' + path.split('/').pop() + '\n\n[Bundle-File für den Skill, ' + matched.size + ']\n\n— Inhalt wird beim Trigger geladen.';
        }
      }
    }
    if (!isGenerated && FILES[path]) {
      fileContent = FILES[path].content;
    }
    if (!fileContent) fileContent = '— Datei existiert noch nicht —';

    viewerTabEl.innerHTML = '<span class="ivt-path">' + escapeHtml(path) + '</span>' + (isGenerated ? '<span class="ivt-tag">NEU · generiert</span>' : '');
    viewerContentEl.innerHTML = '<pre>' + escapeHtml(fileContent) + '</pre>';
  }

  function renderScenarios() {
    scenariosEl.innerHTML = '';
    SCENARIOS.forEach(function (sc) {
      var div = document.createElement('div');
      div.className = 'ide-scenario' + (state.selectedScenario && state.selectedScenario.id === sc.id ? ' active' : '');
      div.innerHTML =
        '<div class="is-tag">' + sc.tag + '</div>' +
        '<div class="is-name">' + G(sc, 'name') + '</div>' +
        '<div class="is-desc">' + G(sc, 'desc') + '</div>';
      div.addEventListener('click', function () {
        state.selectedScenario = sc;
        state.showGenerated = false;
        state.selectedFile = sc.relevantFiles[0] || null;
        renderScenarios();
        renderTree();
        renderViewer();
        renderAnalysis();
      });
      scenariosEl.appendChild(div);
    });
  }

  function renderAnalysis() {
    if (!state.selectedScenario) {
      analysisEl.innerHTML = '<div class="ide-analysis-empty">Wähle oben ein Skill-Szenario. Die Token-Bilanz erscheint hier — und du siehst, warum Skills <em>on-demand</em> existieren.</div>';
      insightEl.innerHTML = '';
      createBtn.disabled = true;
      return;
    }
    var sc = state.selectedScenario;

    // Trigger
    var triggerHtml = '<div class="ide-analysis-section">' +
      '<div class="ide-analysis-title">Trigger-Bedingung</div>' +
      '<div class="ide-skill-trigger mono">' + escapeHtml(sc.trigger) + '</div>' +
    '</div>';

    // Files in the bundle
    var filesHtml = '<div class="ide-analysis-section">' +
      '<div class="ide-analysis-title">Skill-Bundle · ' + sc.files.length + ' Dateien</div>' +
      sc.files.map(function (f) {
        return '<div class="ide-analysis-item ok">' +
          '<span class="iai-name mono">' + f.path.split('/').slice(-1)[0] + '</span>' +
          '<span class="iai-note">' + f.size + (f.isAsset ? ' · Asset' : '') + '</span>' +
          '<span class="iai-status">' + (f.tokens > 0 ? f.tokens + ' tok' : '0 tok') + '</span>' +
        '</div>';
      }).join('') +
    '</div>';

    // Token economics — the heart of this exercise
    var callsTotal = sc.callsPerMonth;
    var callsTriggered = Math.round(callsTotal * sc.frequency);
    var costAlways = sc.tokensLoaded * callsTotal;
    var costSkill = sc.tokensLoaded * callsTriggered;
    var savings = costAlways - costSkill;
    var savingsPct = Math.round((savings / costAlways) * 100);

    // Visualize 100 calls (monthly representation)
    var cells = [];
    var triggerRatio = sc.frequency;
    for (var i = 0; i < 100; i++) {
      var fires = (i / 100) < triggerRatio;
      cells.push('<div class="ts-cell' + (fires ? ' fired' : '') + '"></div>');
    }

    var econHtml = '<div class="ide-analysis-section">' +
      '<div class="ide-analysis-title">Token-Ökonomie · pro Monat</div>' +

      '<div class="ts-row">' +
        '<div class="ts-mode">' +
          '<div class="ts-mode-label">Always-on</div>' +
          '<div class="ts-mode-detail">in AGENTS.md</div>' +
        '</div>' +
        '<div class="ts-cells all-fired">' +
          cells.map(function () { return '<div class="ts-cell fired"></div>'; }).join('') +
        '</div>' +
        '<div class="ts-cost bad">' + formatTok(costAlways) + '</div>' +
      '</div>' +

      '<div class="ts-row">' +
        '<div class="ts-mode">' +
          '<div class="ts-mode-label">Skill on-demand</div>' +
          '<div class="ts-mode-detail">' + (sc.frequency * 100).toFixed(0) + '% Trigger</div>' +
        '</div>' +
        '<div class="ts-cells">' + cells.join('') + '</div>' +
        '<div class="ts-cost ok">' + formatTok(costSkill) + '</div>' +
      '</div>' +

      '<div class="ts-savings"><strong>' + savingsPct + '% gespart</strong> · ' + formatTok(savings) + ' Tokens/Monat</div>' +
    '</div>';

    analysisEl.innerHTML = triggerHtml + filesHtml + econHtml;

    insightEl.innerHTML = '<div class="ide-insight-label">EINSICHT</div><div class="ide-insight-text">' + sc.insight + '</div>';
    createBtn.disabled = state.showGenerated;
    createBtn.textContent = state.showGenerated ? '✓ Skill erzeugt' : '↳ Skill erzeugen';
  }

  function formatTok(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M tok';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k tok';
    return n + ' tok';
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  createBtn.addEventListener('click', function () {
    if (!state.selectedScenario) return;
    state.showGenerated = true;
    state.selectedFile = state.selectedScenario.files[0].path;
    renderTree();
    renderViewer();
    renderAnalysis();
  });

  resetBtn.addEventListener('click', function () {
    state.selectedScenario = null;
    state.selectedFile = null;
    state.showGenerated = false;
    renderScenarios();
    renderTree();
    renderViewer();
    renderAnalysis();
  });

  section.addEventListener('rolechange', function (e) {
    role = e.detail.role;
    state.selectedScenario = null;
    state.selectedFile = null;
    state.showGenerated = false;
    renderScenarios();
    renderTree();
    renderViewer();
    renderAnalysis();
  });

  renderScenarios();
  renderTree();
  renderViewer();
  renderAnalysis();
})();
