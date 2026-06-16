/**
 * Exercise — Agent Builder (IDE view)
 * File tree | viewer | builder. 3 scenarios show how an agent draws on existing files.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="Agent-Builder"]');
  if (!section) return;

  // -------- Project file tree --------
  // Flat path list with file content + metadata
  var FILES = {
    'AGENTS.md': {
      content: '# AcmeSaaS — Team-Standards\n\n' +
               '## Tech-Stack\n- TypeScript + Node 20\n- Postgres 16\n- React 18\n\n' +
               '## Coding-Style\n- Prettier + ESLint strict\n- camelCase für Funktionen\n- Tests neben Code: foo.test.ts\n\n' +
               '## Commits & PRs\n- Conventional Commits\n- PR-Title imperativ\n- Tests + 1 Reviewer\n\n' +
               '## Niemals\n- npm i --force\n- Secrets in Code\n- direkt auf main pushen\n'
    },
    'mcp.json': {
      content: '{\n  "servers": {\n' +
               '    "filesystem": { "active": true  },\n' +
               '    "github":     { "active": true  },\n' +
               '    "slack":      { "active": false, "ready": true },\n' +
               '    "linear":     { "active": false, "ready": true },\n' +
               '    "postgres":   { "active": true  },\n' +
               '    "playwright": { "active": false, "ready": true }\n' +
               '  }\n}'
    },
    '.agents/pr-reviewer.md': {
      content: '---\nname: PR-Reviewer\nmcps: [github, filesystem]\nskills: [code-review]\n---\n\n' +
               '# PR-Reviewer\n\n' +
               '## Rolle\nDu reviewst Pull Requests gegen unsere Team-Standards aus AGENTS.md.\n\n' +
               '## Workflow\n1. Lade Diff via GitHub-MCP\n2. Nutze code-review Skill für Standards\n3. Markiere Tests, Style, Architektur\n4. Approve / Request Changes / Comment\n'
    },
    'skills/markdown-report/SKILL.md': {
      content: '---\ntrigger: when user requests "summary" or "weekly report" or "status update"\ntokens-when-loaded: 1800\n---\n\n' +
               '# Markdown-Report Skill\n\n' +
               'Formatiert Datenquellen als Markdown-Reports.\n\n' +
               '## Templates\n- weekly-report\n- incident-summary\n- sprint-recap\n\n' +
               '## Output-Style\n- ## Heading je Quelle\n- Bullet-Listen für Items\n- Code-Blocks für Logs\n'
    },
    'skills/code-review/SKILL.md': {
      content: '---\ntrigger: when reviewing PR diffs\ntokens-when-loaded: 2400\n---\n\n' +
               '# Code-Review Skill\n\n' +
               'Wendet Team-Standards aus AGENTS.md an.\n\n' +
               '## Checks\n- ESLint-Verstöße\n- Fehlende Tests\n- Architektur-Brüche\n- Naming-Konventionen\n'
    },
    'skills/pptx-export/SKILL.md': {
      content: '---\ntrigger: when user says "export as slides" or "save as pptx"\ntokens-when-loaded: 3500\n---\n\n' +
               '# PPTX Export Skill\n\n' +
               'Konvertiert Markdown-Decks in editable PPTX.\n'
    },
    'docs/api.md': {
      content: '# API-Übersicht\n\nREST über /api/v1/...\nSiehe openapi.yaml für volle Spec.\n'
    },
    'docs/playbooks/postmortem.md': {
      content: '# Postmortem-Template\n\n## Was ist passiert\n...\n\n## Root Cause\n...\n\n## Action Items\n...\n'
    },
    'src/auth.ts': {
      content: '// Authentication module\nexport function validateToken(t: string) {\n  // ...\n}\n'
    },
    'src/api/users.ts': {
      content: '// User API endpoints\nexport async function getUser(id: string) {\n  // ...\n}\n'
    }
  };

  // -------- Scenarios --------
  var SCENARIOS = [
    {
      id: 'weekly',
      tag: 'CRON-AGENT',
      name: 'Wochen-Report-Agent',
      desc: 'Liest Slack, GitHub und Linear der letzten Woche. Erzeugt Markdown-Summary für #leadership.',
      desc_nd: 'Liest Team-Chat, Projekt-Tool und CRM der letzten Woche. Erzeugt eine Zusammenfassung fürs Management.',
      relevantFiles: ['mcp.json', 'skills/markdown-report/SKILL.md', 'docs/playbooks/postmortem.md'],
      mcps: [
        { name: 'slack',  status: 'aktivieren', note: '#eng, #incidents' },
        { name: 'github', status: 'aktiv ✓',    note: 'merged PRs' },
        { name: 'linear', status: 'aktivieren', note: 'geschlossene Tickets' }
      ],
      skills: [
        { name: 'markdown-report', note: 'für das Output-Format' }
      ],
      newFile: '.agents/weekly-report.md',
      newContent: '---\nname: Weekly-Report-Agent\nmcps: [slack, github, linear]\nskills: [markdown-report]\nschedule: "Friday 16:00 Europe/Berlin"\n---\n\n' +
                  '# Weekly-Report-Agent\n\n' +
                  '## Rolle\nDu fasst die Aktivität des Teams der letzten 7 Tage zusammen.\n\n' +
                  '## Workflow\n1. Slack: lese #eng + #incidents seit letztem Freitag.\n2. GitHub: liste alle gemergten PRs.\n3. Linear: liste alle geschlossenen Issues.\n4. Lade Skill `markdown-report`, Template `weekly-report`.\n5. Schreibe nach docs/reports/weekly-<datum>.md.\n\n' +
                  '## Output\n## Eng-Highlights · ## Incidents · ## Numbers (Lines · PRs · Tickets)\n',
      insight: 'Du schreibst nicht den Report-Code — du <strong>verschaltest</strong>: 3 MCPs + 1 Skill, die schon da sind.'
    },
    {
      id: 'pr-extend',
      tag: 'AGENT ERWEITERN',
      name: 'PR-Reviewer +Security',
      name_nd: 'Dokumenten-Prüfer +Compliance',
      desc: 'Existierenden PR-Reviewer um Security-Checks erweitern (Secret-Detection, Dependency-Audit).',
      desc_nd: 'Bestehenden Dokumenten-Prüfer um Compliance-Checks erweitern (Daten-Leak-Erkennung, Quellen-Audit).',
      relevantFiles: ['.agents/pr-reviewer.md', 'skills/code-review/SKILL.md', 'AGENTS.md'],
      mcps: [
        { name: 'github',     status: 'aktiv ✓', note: 'diff-Zugriff' },
        { name: 'filesystem', status: 'aktiv ✓', note: 'package.json lesen' }
      ],
      skills: [
        { name: 'code-review',  note: 'bestehende Standards' },
        { name: 'security-scan', note: 'neu zu schreiben', missing: true }
      ],
      newFile: '.agents/pr-reviewer.md',
      newContent: '---\nname: PR-Reviewer\nmcps: [github, filesystem]\nskills: [code-review, security-scan]   # ← security-scan neu\n---\n\n' +
                  '# PR-Reviewer\n\n' +
                  '## Rolle\nReviewt PRs gegen AGENTS.md UND Security-Standards.\n\n' +
                  '## Workflow\n1. Lade Diff (GitHub-MCP)\n2. code-review Skill: Style, Tests, Architektur\n3. <strong>NEU:</strong> security-scan Skill: Secret-Detection, Dependency-Audit\n4. Verdict: Approve / Request Changes\n\n' +
                  '## Eskalation\nBei detektiertem Secret: <strong>BLOCK</strong>, kein Approve möglich.\n',
      insight: 'Du erweiterst — nicht neu schreiben. Bestehender Agent bleibt, ein neuer Skill kommt dazu.'
    },
    {
      id: 'onboarding',
      tag: 'HUMAN-FACING AGENT',
      name: 'Onboarding-Buddy',
      desc: 'Hilft neuen Devs am ersten Tag: führt durch AGENTS.md, zeigt aktive Skills, gibt Start-Tasks.',
      desc_nd: 'Hilft neuen Mitarbeitenden am ersten Tag: führt durch die Team-Regeln, zeigt verfügbare Fähigkeiten, gibt Start-Aufgaben.',
      relevantFiles: ['AGENTS.md', 'skills/markdown-report/SKILL.md', 'skills/code-review/SKILL.md', 'skills/pptx-export/SKILL.md'],
      mcps: [
        { name: 'filesystem', status: 'aktiv ✓', note: 'Repo-Tour' }
      ],
      skills: [
        { name: '—', note: 'keine speziellen — Buddy nutzt nur Filesystem' }
      ],
      newFile: '.agents/onboarding-buddy.md',
      newContent: '---\nname: Onboarding-Buddy\nmcps: [filesystem]\nskills: []\n---\n\n' +
                  '# Onboarding-Buddy\n\n' +
                  '## Rolle\nFreundlicher Begleiter für neue Devs. Tag 1.\n\n' +
                  '## Workflow\n1. Lese AGENTS.md, fasse 3 wichtigste Regeln zusammen.\n2. Liste verfügbare Skills (`ls skills/`).\n3. Stelle 3 Start-Tasks vor, an denen man die Codebase erfühlt.\n\n' +
                  '## Ton\nWarm, geduldig, keine Akronyme ohne Erklärung.\n',
      insight: 'Manche Agenten brauchen keine Skills, keine MCPs außer Filesystem. <strong>AGENTS.md ist Kontext genug.</strong>'
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
  var treeEl = section.querySelector('#agent-tree');
  var viewerTabEl = section.querySelector('#agent-viewer-tab');
  var viewerContentEl = section.querySelector('#agent-viewer-content');
  var scenariosEl = section.querySelector('#agent-scenarios');
  var analysisEl = section.querySelector('#agent-analysis');
  var insightEl = section.querySelector('#agent-insight');
  var createBtn = section.querySelector('#agent-create');
  var resetBtn = section.querySelector('#agent-reset');

  // -------- Render tree --------
  function renderTree() {
    // Build path-tree visual (flat with indent)
    var paths = Object.keys(FILES);
    // include implied dir prefixes
    var dirSet = {};
    paths.forEach(function (p) {
      var parts = p.split('/');
      for (var i = 1; i < parts.length; i++) {
        dirSet[parts.slice(0, i).join('/') + '/'] = true;
      }
    });
    var all = Object.keys(dirSet).concat(paths).sort();

    // also add the generated file (if scenario selected and showGenerated)
    if (state.showGenerated && state.selectedScenario) {
      var newPath = state.selectedScenario.newFile;
      if (all.indexOf(newPath) === -1) {
        // include its dir prefixes too
        var nparts = newPath.split('/');
        for (var j = 1; j < nparts.length; j++) {
          var dp = nparts.slice(0, j).join('/') + '/';
          if (all.indexOf(dp) === -1) all.push(dp);
        }
        all.push(newPath);
        all.sort();
      }
    }

    var relevant = state.selectedScenario ? state.selectedScenario.relevantFiles : [];

    treeEl.innerHTML = '';
    // project root header
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
      var isNew = state.showGenerated && state.selectedScenario && state.selectedScenario.newFile === path;

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

  // -------- Render viewer --------
  function renderViewer() {
    var path = state.selectedFile;
    if (!path && state.showGenerated && state.selectedScenario) {
      path = state.selectedScenario.newFile;
    }

    if (!path) {
      viewerTabEl.innerHTML = '<span style="color: var(--ink-3);">— keine Datei ausgewählt —</span>';
      viewerContentEl.innerHTML = '<div class="ide-viewer-empty">Klicke eine Datei links · oder wähle ein Szenario rechts → siehst, welche Dateien relevant werden.</div>';
      return;
    }

    var fileContent;
    var isGenerated = false;
    if (state.showGenerated && state.selectedScenario && state.selectedScenario.newFile === path) {
      fileContent = state.selectedScenario.newContent;
      isGenerated = true;
    } else if (FILES[path]) {
      fileContent = FILES[path].content;
    } else {
      fileContent = '— Datei noch nicht erzeugt —';
    }

    viewerTabEl.innerHTML = '<span class="ivt-path">' + escapeHtml(path) + '</span>' + (isGenerated ? '<span class="ivt-tag">NEU · generiert</span>' : '');
    viewerContentEl.innerHTML = '<pre>' + escapeHtml(fileContent) + '</pre>';
  }

  // -------- Render scenarios --------
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

  // -------- Render analysis --------
  function renderAnalysis() {
    if (!state.selectedScenario) {
      analysisEl.innerHTML = '<div class="ide-analysis-empty">Wähle oben ein Szenario — die Analyse erscheint hier: welche MCPs, welche Skills, welche Datei entsteht.</div>';
      insightEl.innerHTML = '';
      createBtn.disabled = true;
      return;
    }
    var sc = state.selectedScenario;

    var mcpHtml = '<div class="ide-analysis-section">' +
      '<div class="ide-analysis-title">MCPs · ' + sc.mcps.length + ' nötig</div>' +
      sc.mcps.map(function (m) {
        var warn = m.status.indexOf('aktivieren') >= 0;
        return '<div class="ide-analysis-item' + (warn ? ' warn' : ' ok') + '">' +
          '<span class="iai-name">' + m.name + '</span>' +
          '<span class="iai-note">' + m.note + '</span>' +
          '<span class="iai-status">' + m.status + '</span>' +
        '</div>';
      }).join('') +
    '</div>';

    var skillHtml = '<div class="ide-analysis-section">' +
      '<div class="ide-analysis-title">Skills · ' + sc.skills.length + ' verwendet</div>' +
      sc.skills.map(function (s) {
        return '<div class="ide-analysis-item' + (s.missing ? ' warn' : ' ok') + '">' +
          '<span class="iai-name">' + s.name + '</span>' +
          '<span class="iai-note">' + s.note + '</span>' +
          '<span class="iai-status">' + (s.missing ? 'neu' : 'verfügbar ✓') + '</span>' +
        '</div>';
      }).join('') +
    '</div>';

    var fileHtml = '<div class="ide-analysis-section">' +
      '<div class="ide-analysis-title">Neue Datei</div>' +
      '<div class="ide-analysis-item ok">' +
        '<span class="iai-name mono">' + sc.newFile + '</span>' +
        '<span class="iai-note">Agent-Definition (Markdown + YAML-Header)</span>' +
        '<span class="iai-status">~' + sc.newContent.length + ' B</span>' +
      '</div>' +
    '</div>';

    analysisEl.innerHTML = mcpHtml + skillHtml + fileHtml;

    insightEl.innerHTML = '<div class="ide-insight-label">EINSICHT</div><div class="ide-insight-text">' + sc.insight + '</div>';
    createBtn.disabled = state.showGenerated;
    createBtn.textContent = state.showGenerated ? '✓ Agent erzeugt' : '↳ Agent erzeugen';
  }

  // -------- Actions --------
  createBtn.addEventListener('click', function () {
    if (!state.selectedScenario) return;
    state.showGenerated = true;
    state.selectedFile = state.selectedScenario.newFile;
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

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

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

  // -------- Init --------
  renderScenarios();
  renderTree();
  renderViewer();
  renderAnalysis();
})();
