/**
 * Exercise — Connection-Graph (Click-to-activate)
 * ELF konkrete Knoten: UserChat · 3 Agenten · 3 Skills · 4 MCPs.
 * ALLE Knoten sind dauerhaft sichtbar. Wähl eine Aufgabe → der/die Lernende
 * AKTIVIERT per Klick selbst die Knoten, die für DIESE Aufgabe nötig sind.
 * Nochmal klicken = deaktivieren. Token-Budget reagiert live. "Prüfen" vergleicht die Auswahl mit dem
 * wirklich nötigen Satz: Fehlt (rot) vs. Zu viel (gelb — Token ohne Gegenwert).
 * AGENTS.md ist kein Knoten — die always-on-Basis steckt im UserChat-Knoten und
 * im Context-Window. Audience-Umschalter (Dev/Non-Dev) wechselt die Knoten-Namen.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="Connection-Graph"]');
  if (!section) return;

  // ---------- Knoten (Position in % der Zeichenfläche) ----------
  var NODES = {
    user: {
      kind: 'user', x: 9, y: 50,
      label: 'UserChat', label_nd: 'UserChat',
      kicker: 'TURN', kicker_nd: 'TURN',
      sub: 'AGENTS.md · <span class="cn-im">always-on</span>', sub_nd: 'Dauerkontext · <span class="cn-im">always-on</span>'
    },

    a_release:    { kind: 'agent', x: 33, y: 19, label: 'release-notes-agent', label_nd: 'protokoll-agent',  kicker: 'AGENT · on-demand', kicker_nd: 'AGENT · on-demand', sub: 'in <span class="cn-im">.agents/</span>', sub_nd: 'definierter Agent' },
    a_confluence: { kind: 'agent', x: 33, y: 50, label: 'confluence-agent',    label_nd: 'report-agent',     kicker: 'AGENT · on-demand', kicker_nd: 'AGENT · on-demand', sub: 'in <span class="cn-im">.agents/</span>', sub_nd: 'definierter Agent' },
    a_jira:       { kind: 'agent', x: 33, y: 81, label: 'jira-agent',          label_nd: 'bestands-agent',   kicker: 'AGENT · on-demand', kicker_nd: 'AGENT · on-demand', sub: 'in <span class="cn-im">.agents/</span>', sub_nd: 'definierter Agent' },

    s_pptx:   { kind: 'skill', x: 60, y: 17, label: 'pptx-export',     label_nd: 'folien-export', kicker: 'SKILL', kicker_nd: 'SKILL', sub: 'Body <span class="cn-im">on-demand</span>', sub_nd: 'lädt bei Bedarf' },
    s_review: { kind: 'skill', x: 60, y: 42, label: 'code-review',     label_nd: 'doku-check',    kicker: 'SKILL', kicker_nd: 'SKILL', sub: 'Body <span class="cn-im">on-demand</span>', sub_nd: 'lädt bei Bedarf' },
    s_report: { kind: 'skill', x: 60, y: 67, label: 'markdown-report', label_nd: 'report-format', kicker: 'SKILL', kicker_nd: 'SKILL', sub: 'Body <span class="cn-im">on-demand</span>', sub_nd: 'lädt bei Bedarf' },

    m_postgres:   { kind: 'mcp', x: 88, y: 14, label: 'datenbank',  label_nd: 'linear',       kicker: 'MCP', kicker_nd: 'TOOL', sub: 'Schema <span class="cn-im">always-on</span>', sub_nd: 'Tool · on-demand' },
    m_github:     { kind: 'mcp', x: 88, y: 38, label: 'github',     label_nd: 'filesystem',   kicker: 'MCP', kicker_nd: 'TOOL', sub: 'Schema <span class="cn-im">always-on</span>', sub_nd: 'Tool · on-demand' },
    m_confluence: { kind: 'mcp', x: 88, y: 62, label: 'confluence', label_nd: 'wiki',         kicker: 'MCP', kicker_nd: 'TOOL', sub: 'Schema <span class="cn-im">always-on</span>', sub_nd: 'Tool · on-demand' },
    m_jira:       { kind: 'mcp', x: 88, y: 87, label: 'jira',       label_nd: 'warehouse-db', kicker: 'MCP', kicker_nd: 'TOOL', sub: 'Schema <span class="cn-im">always-on</span>', sub_nd: 'Tool · on-demand' }
  };
  var NODE_ORDER = ['user', 'a_release', 'a_confluence', 'a_jira', 's_pptx', 's_review', 's_report', 'm_postgres', 'm_github', 'm_confluence', 'm_jira'];
  var KIND_ORDER = { agent: 0, skill: 1, mcp: 2 };

  // ---------- Aufgaben ----------
  // lit  : Knoten, die für die Aufgabe geladen werden MÜSSEN (user ist implizit immer da)
  // edges: konkrete Verbindungen {from, to, label(+_nd)} — from/to sind Knoten-IDs
  var TASKS = [
    {
      id: 'qa',
      tag: 'Ad-hoc · Wissensfrage',
      name:    'Was macht <span class="cg-code">git rebase -i</span>?',
      name_nd: 'Was bedeutet „Time-to-Live"?',
      lit: ['user'],
      edges: [],
      insight:    'Nur der Turn. Die <strong>AGENTS.md-Basis ist always-on</strong> — sonst brauchst du nichts: keinen Agenten, keine Skill, kein Tool. Jeder geladene Knoten wäre hier verschenkt.',
      insight_nd: 'Nur der Turn. Der <strong>Dauerkontext ist always-on</strong> — sonst brauchst du nichts: keinen Agenten, keine Skill, kein Tool.'
    },
    {
      id: 'lookup',
      tag: 'Ad-hoc · Tool-Abfrage',
      name:    'Welche Spalten hat die Tabelle <span class="cg-code">users</span> in der Datenbank?',
      name_nd: 'Wie viele Tickets sind gerade offen?',
      lit: ['user', 'm_postgres'],
      edges: [
        { from: 'user', to: 'm_postgres', label: 'Tool direkt', label_nd: 'Tool direkt' }
      ],
      insight: 'Ad-hoc: Der <strong>Turn ruft das MCP direkt</strong>. Keine Skill, kein Agent nötig — und nur <em>dieses eine</em> Tool, nicht alle vier.'
    },
    {
      id: 'adhoc-skill',
      tag: 'Ad-hoc · Skill',
      name:    'Exportiere diese Notizen als Präsentation.',
      name_nd: 'Mache aus diesen Notizen Folien.',
      lit: ['user', 's_pptx'],
      edges: [
        { from: 'user', to: 's_pptx', label: 'direkt getriggert', label_nd: 'direkt getriggert' }
      ],
      insight: 'Eine Skill wird <strong>direkt vom Chat</strong> getriggert — sie braucht <strong>keinen Agenten</strong> und kein Tool.'
    },
    {
      id: 'skill-tool',
      tag: 'Ad-hoc · Skill ruft Tool',
      name:    'Review diesen Diff gegen unsere Standards.',
      name_nd: 'Prüfe dieses Dokument auf Abweichungen.',
      lit: ['user', 's_review', 'm_github'],
      edges: [
        { from: 'user',     to: 's_review',  label: 'direkt getriggert', label_nd: 'direkt getriggert' },
        { from: 's_review', to: 'm_github',  label: 'Skill holt Diff',   label_nd: 'Skill liest Doku' }
      ],
      insight: 'Die <strong>Skill ruft das MCP selbst</strong> — Tools hängen nicht nur am Turn oder Agenten. Beide Knoten gehören dazu.'
    },
    {
      id: 'agent-skill',
      tag: 'Definierter Agent · nur Skill',
      name:    'Release-Notes-Agent: formatiere das Changelog.',
      name_nd: 'Protokoll-Agent: fasse das Meeting zusammen.',
      lit: ['user', 'a_release', 's_report'],
      edges: [
        { from: 'user',      to: 'a_release', label: 'Agent aufgerufen', label_nd: 'Agent aufgerufen' },
        { from: 'a_release', to: 's_report',  label: 'Agent → Skill',    label_nd: 'Agent → Skill' }
      ],
      insight:    'Von mehreren Agenten lädt <strong>nur der aufgerufene</strong> — <span class="cg-code">confluence-agent</span> und <span class="cg-code">jira-agent</span> wären hier verschenkter Kontext.',
      insight_nd: 'Von mehreren Agenten lädt <strong>nur der aufgerufene</strong> — die anderen wären verschenkter Kontext.'
    },
    {
      id: 'agent-full',
      tag: 'Definierter Agent · Skill + Tool',
      name:    'Confluence-Agent: veröffentliche den Wochenreport als Seite.',
      name_nd: 'Report-Agent: veröffentliche den Wochenreport.',
      lit: ['user', 'a_confluence', 's_report', 'm_confluence'],
      edges: [
        { from: 'user',         to: 'a_confluence',  label: 'Agent aufgerufen', label_nd: 'Agent aufgerufen' },
        { from: 'a_confluence', to: 's_report',      label: 'Agent → Skill',    label_nd: 'Agent → Skill' },
        { from: 'a_confluence', to: 'm_confluence',  label: 'Agent → Tool',     label_nd: 'Agent → Tool' }
      ],
      insight:    'Der Agent <strong>wired sich an Skill UND MCP</strong> — drei Knoten. Andere Agenten (z.&nbsp;B. <span class="cg-code">jira-agent</span>) gehören <strong>nicht</strong> dazu.',
      insight_nd: 'Der Agent <strong>wired sich an Skill UND Tool</strong> — drei Knoten. Andere Agenten gehören <strong>nicht</strong> dazu.'
    },
    {
      id: 'agent-tool',
      tag: 'Definierter Agent · nur Tool',
      name:    'Jira-Agent: hole alle offenen Tickets.',
      name_nd: 'Bestands-Agent: prüfe die Lagerzahlen.',
      lit: ['user', 'a_jira', 'm_jira'],
      edges: [
        { from: 'user',   to: 'a_jira', label: 'Agent aufgerufen', label_nd: 'Agent aufgerufen' },
        { from: 'a_jira', to: 'm_jira', label: 'Agent → Tool',     label_nd: 'Agent → Tool' }
      ],
      insight: 'Auch nur ein Tool ist ok. Und: von mehreren Agenten lädt <strong>immer nur der aufgerufene</strong> — nicht alle.'
    }
  ];

  // ---------- Token-Budget (Darstellung à la /context) ----------
  var WINDOW_TOK = 200000;
  var ALWAYS = [
    { cls: 'sys', tok: 4000, label: 'System &amp; Tools',   sub: 'Prompt + Kern-Werkzeuge' },
    { cls: 'mem', tok: 2000, label: 'AGENTS.md',            sub: 'Memory · ganze Datei always-on' },
    { cls: 'skh', tok: 1500, label: 'Skill-Beschreibungen', sub: '3 Header · Body on-demand' }
  ];
  var MCP_IDS = ['m_postgres', 'm_github', 'm_confluence', 'm_jira'];
  var MCP_SCHEMA_TOK = 3000;
  var ALWAYS_TOK = 4000 + 2000 + 1500 + MCP_IDS.length * MCP_SCHEMA_TOK; // 19500
  var OD_TOK = { agent: 2500, skill: 2000, mcp: 4000 };

  // ---------- State ----------
  var role = section.dataset.role || 'dev';
  var selected = TASKS[0].id; // erste Aufgabe ist vorausgewählt
  var loaded = {};            // nodeId -> true  (was der/die Lernende geladen hat)
  var checked = false;        // "Prüfen" gedrückt?
  function R(o, k) { return (role === 'nondev' && o && o[k + '_nd'] !== undefined) ? o[k + '_nd'] : (o ? o[k] : undefined); }
  function currentTask() { return selected ? TASKS.filter(function (t) { return t.id === selected; })[0] : null; }
  function requiredSet(task) {
    var s = {};
    if (task) task.lit.forEach(function (id) { if (id !== 'user') s[id] = true; });
    return s;
  }
  function loadedIds() { return NODE_ORDER.filter(function (id) { return loaded[id]; }); }

  // ---------- Elements ----------
  var ddEl          = section.querySelector('#cgraph-dd');
  var triggerEl     = section.querySelector('#cgraph-trigger');
  var triggerTextEl = section.querySelector('#cgraph-trigger-text');
  var menuEl        = section.querySelector('#cgraph-menu');
  var canvasEl  = section.querySelector('#cgraph-canvas');
  var svgEl     = section.querySelector('#cgraph-edges');
  var labelsEl  = section.querySelector('#cgraph-labels');
  var traceEl   = section.querySelector('#cgraph-trace-body');
  var insightEl = section.querySelector('#cgraph-insight');
  var resetBtn  = section.querySelector('#cgraph-reset');
  var checkBtn  = section.querySelector('#cgraph-pruefen');
  var clearBtn  = section.querySelector('#cgraph-clear');

  // ---------- Build nodes (once) ----------
  var nodeEls = {};
  function buildNodes() {
    NODE_ORDER.forEach(function (id) {
      var n = NODES[id];
      var el = document.createElement('div');
      el.className = 'cgraph-node n-' + n.kind;
      el.dataset.node = id;
      el.style.left = n.x + '%';
      el.style.top = n.y + '%';
      el.innerHTML =
        '<span class="cn-grab" aria-hidden="true"></span>' +
        '<div class="cn-kicker"><span class="cn-dot"></span><span class="cn-kick-text"></span></div>' +
        '<div class="cn-name"></div>' +
        '<div class="cn-sub"></div>' +
        '<div class="cn-cost"></div>' +
        '<button type="button" class="cn-peek">Inhalt ansehen ›</button>' +
        '<span class="cn-badge-state cn-loaded">geladen</span>' +
        '<span class="cn-badge-state cn-miss">fehlt</span>';
      canvasEl.appendChild(el);
      nodeEls[id] = el;
      if (id !== 'user') {
        el.addEventListener('click', function () { onNodeClick(id); });
      }
      (function (nid) {
        var pk = el.querySelector('.cn-peek');
        if (pk) pk.addEventListener('click', function (e) { e.stopPropagation(); openPeek(nid); });
      })(id);
    });
    paintNodeText();
  }
  // Pro Kachel: was liegt IMMER im Fenster vs. was kommt bei Aktivierung DAZU.
  // Zahlen spiegeln exakt das Token-Budget rechts (ALWAYS-Bucket + OD_TOK).
  var COST = {
    agent: { im: 'nichts',                  od: 'Definition <b>2.5k</b>' },
    skill: { im: 'Beschreibung <b>0.5k</b>', od: 'Body <b>2k</b>' },
    mcp:   { im: 'Schema <b>3k</b>',         od: 'Ergebnis <b>4k</b>' }
  };
  function paintNodeText() {
    NODE_ORDER.forEach(function (id) {
      var n = NODES[id], el = nodeEls[id];
      el.querySelector('.cn-kick-text').innerHTML = R(n, 'kicker');
      el.querySelector('.cn-name').textContent = R(n, 'label');
      var subEl = el.querySelector('.cn-sub');
      var costEl = el.querySelector('.cn-cost');
      if (id === 'user') {
        subEl.innerHTML = R(n, 'sub');
        subEl.style.display = '';
        costEl.style.display = 'none';
      } else {
        var c = COST[n.kind];
        subEl.style.display = 'none';
        costEl.style.display = '';
        costEl.innerHTML =
          '<div class="cn-cost-row im"><span class="cc-tag">immer</span><span class="cc-txt">' + c.im + '</span></div>' +
          '<div class="cn-cost-row od"><span class="cc-tag">+ aktiv</span><span class="cc-txt">' + c.od + '</span></div>';
      }
    });
  }
  function paintGrabHints() {
    NODE_ORDER.forEach(function (id) {
      if (id === 'user') return;
      var g = nodeEls[id].querySelector('.cn-grab');
      if (g) g.textContent = loaded[id] ? '✕ raus' : '+ aktivieren';
    });
  }

  // ---------- Peek: konkreter Datei-Inhalt pro Knoten ----------
  // Zeigt, wie der Knoten WIRKLICH aussieht: MCP = welche Tools · Skill = Header + grober Body · Agent = grobe Definition.
  // 'always'-Zonen sind immer im Fenster (grün). 'od'-Zonen werden grün, sobald der Knoten aktiviert ist.
  var boardEl = section.querySelector('.cgraph-board');
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var PEEK = {
    user: {
      dev: { kindlbl: 'Turn · Memory', file: 'AGENTS.md', zones: [
        { head: 'Ganze Datei · jeder Turn', mode: 'always', lines: [
          '# payments-service', 'Stack: TypeScript · Postgres', 'Commits: Conventional Commits', 'Test: `npm test` vor jedem PR' ] } ],
        cap: 'Memory ist <em>komplett always-on</em> — jede Zeile zählt in <em>jeden</em> Turn. Darum kurz halten.' },
      nd: { kindlbl: 'Turn · Dauerkontext', file: 'Projekt-Kontext', zones: [
        { head: 'Ganze Datei · jeder Turn', mode: 'always', lines: [
          '# Wochen-Reporting', 'Quellen: Wiki · Warehouse', 'Format: kurze Bullet-Reports', 'Ton: sachlich, ohne Jargon' ] } ],
        cap: 'Der Dauerkontext ist <em>komplett always-on</em> — jede Zeile zählt in <em>jeden</em> Turn.' }
    },

    a_release: {
      dev: { kindlbl: 'Agent · Definition', file: '.agents/release-notes-agent.md', zones: [
        { head: 'Definition · lädt erst beim Aufruf', mode: 'od', lines: [
          '---', 'name: release-notes-agent', 'when: Changelog formatieren', 'tools: [github, markdown-report]', '---',
          'Lies den Diff seit dem letzten Tag.', 'Gruppiere feat / fix / chore.', 'Schreib knappe, nutzbare Notes.' ] } ],
        cap: AGENT_CAP() },
      nd: { kindlbl: 'Agent · Definition', file: 'protokoll-agent', zones: [
        { head: 'Definition · lädt erst beim Aufruf', mode: 'od', lines: [
          '---', 'name: protokoll-agent', 'when: Meeting zusammenfassen', 'tools: [wiki]', '---',
          'Lies die Notizen.', 'Fasse Beschlüsse + To-dos.' ] } ],
        cap: AGENT_CAP() }
    },
    a_confluence: {
      dev: { kindlbl: 'Agent · Definition', file: '.agents/confluence-agent.md', zones: [
        { head: 'Definition · lädt erst beim Aufruf', mode: 'od', lines: [
          '---', 'name: confluence-agent', 'when: Wochenreport veröffentlichen', 'tools: [confluence, markdown-report]', '---',
          'Sammle die Punkte der Woche.', 'Formatiere als Report (Skill).', 'Lege Confluence-Seite an (Tool).' ] } ],
        cap: AGENT_CAP() },
      nd: { kindlbl: 'Agent · Definition', file: 'report-agent', zones: [
        { head: 'Definition · lädt erst beim Aufruf', mode: 'od', lines: [
          '---', 'name: report-agent', 'when: Wochenreport veröffentlichen', 'tools: [wiki, report-format]', '---',
          'Sammle die Punkte der Woche.', 'Formatiere als Report.', 'Lege Wiki-Seite an.' ] } ],
        cap: AGENT_CAP() }
    },
    a_jira: {
      dev: { kindlbl: 'Agent · Definition', file: '.agents/jira-agent.md', zones: [
        { head: 'Definition · lädt erst beim Aufruf', mode: 'od', lines: [
          '---', 'name: jira-agent', 'when: Tickets abfragen/anlegen', 'tools: [jira]', '---',
          'Frag offene Tickets per JQL ab.', 'Fasse nach Status zusammen.' ] } ],
        cap: AGENT_CAP() },
      nd: { kindlbl: 'Agent · Definition', file: 'bestands-agent', zones: [
        { head: 'Definition · lädt erst beim Aufruf', mode: 'od', lines: [
          '---', 'name: bestands-agent', 'when: Lagerzahlen prüfen', 'tools: [warehouse-db]', '---',
          'Frag Bestände ab.', 'Melde Unterschreitungen.' ] } ],
        cap: AGENT_CAP() }
    },

    s_pptx: {
      dev: { kindlbl: 'Skill · SKILL.md', file: '.skills/pptx-export/SKILL.md', zones: [
        { head: 'Beschreibung · immer im Fenster (0.5k)', mode: 'always', lines: [
          '---', 'name: pptx-export', 'description: Exportiert Inhalte als', '  .pptx-Präsentation mit Layout.', '---' ] },
        { head: 'Body · lädt erst bei Nutzung (2k)', mode: 'od', lines: [
          '## Vorgehen', '1. Gliedere in Slides.', '2. Wähle Master-Layout.', '3. Rendere via python-pptx.', '… (gekürzt)' ] } ],
        cap: SKILL_CAP() },
      nd: { kindlbl: 'Skill · SKILL.md', file: 'folien-export', zones: [
        { head: 'Beschreibung · immer im Fenster (0.5k)', mode: 'always', lines: [
          '---', 'name: folien-export', 'description: Macht aus Notizen', '  fertige Folien.', '---' ] },
        { head: 'Body · lädt erst bei Nutzung (2k)', mode: 'od', lines: [
          '## Vorgehen', '1. In Folien gliedern.', '2. Layout wählen.', '3. Export.', '… (gekürzt)' ] } ],
        cap: SKILL_CAP() }
    },
    s_review: {
      dev: { kindlbl: 'Skill · SKILL.md', file: '.skills/code-review/SKILL.md', zones: [
        { head: 'Beschreibung · immer im Fenster (0.5k)', mode: 'always', lines: [
          '---', 'name: code-review', 'description: Prüft einen Diff gegen', '  Style- & Security-Standards.', '---' ] },
        { head: 'Body · lädt erst bei Nutzung (2k)', mode: 'od', lines: [
          '## Vorgehen', '1. Hole den Diff (github).', '2. Prüfe gegen .standards/*.', '3. Liste Verstöße + Severity.', '… (gekürzt)' ] } ],
        cap: SKILL_CAP() },
      nd: { kindlbl: 'Skill · SKILL.md', file: 'doku-check', zones: [
        { head: 'Beschreibung · immer im Fenster (0.5k)', mode: 'always', lines: [
          '---', 'name: doku-check', 'description: Prüft ein Dokument auf', '  Abweichungen vom Standard.', '---' ] },
        { head: 'Body · lädt erst bei Nutzung (2k)', mode: 'od', lines: [
          '## Vorgehen', '1. Doku laden (wiki).', '2. Gegen Vorgabe prüfen.', '3. Abweichungen listen.', '… (gekürzt)' ] } ],
        cap: SKILL_CAP() }
    },
    s_report: {
      dev: { kindlbl: 'Skill · SKILL.md', file: '.skills/markdown-report/SKILL.md', zones: [
        { head: 'Beschreibung · immer im Fenster (0.5k)', mode: 'always', lines: [
          '---', 'name: markdown-report', 'description: Formatiert Inhalte als', '  sauberen Markdown-Report.', '---' ] },
        { head: 'Body · lädt erst bei Nutzung (2k)', mode: 'od', lines: [
          '## Vorgehen', '1. Titel + Datum + TL;DR.', '2. Abschnitte mit Bullets.', '3. Quellen verlinken.', '… (gekürzt)' ] } ],
        cap: SKILL_CAP() },
      nd: { kindlbl: 'Skill · SKILL.md', file: 'report-format', zones: [
        { head: 'Beschreibung · immer im Fenster (0.5k)', mode: 'always', lines: [
          '---', 'name: report-format', 'description: Bringt Inhalte in', '  unser Report-Format.', '---' ] },
        { head: 'Body · lädt erst bei Nutzung (2k)', mode: 'od', lines: [
          '## Vorgehen', '1. Titel + Datum + Kurzfazit.', '2. Abschnitte mit Bullets.', '3. Quellen nennen.', '… (gekürzt)' ] } ],
        cap: SKILL_CAP() }
    },

    m_postgres: {
      dev: { kindlbl: 'MCP · Tool-Server', file: 'MCP · datenbank', zones: [
        { head: 'Tool-Schemas · immer im Fenster (3k)', mode: 'always', lines: [
          'Tools (Signaturen):', '• list_tables()', '• describe_table(name)', '• run_query(sql)' ] },
        { head: 'Aufruf-Ergebnis · nur wenn genutzt (4k)', mode: 'od', lines: [
          '→ describe_table("users")', 'id, email, created_at, …', '12 Spalten · 3 Indizes' ] } ],
        cap: MCP_CAP() },
      nd: { kindlbl: 'Tool', file: 'Tool · linear', zones: [
        { head: 'Tool-Schemas · immer im Fenster (3k)', mode: 'always', lines: [
          'Tools (Signaturen):', '• list_issues(team)', '• get_issue(id)', '• create_issue(title)' ] },
        { head: 'Aufruf-Ergebnis · nur wenn genutzt (4k)', mode: 'od', lines: [
          '→ list_issues("Web")', '9 offen · 2 dringend' ] } ],
        cap: MCP_CAP() }
    },
    m_github: {
      dev: { kindlbl: 'MCP · Tool-Server', file: 'MCP · github', zones: [
        { head: 'Tool-Schemas · immer im Fenster (3k)', mode: 'always', lines: [
          'Tools (Signaturen):', '• get_pull_request(id)', '• list_commits(branch)', '• create_issue(title, body)', '• get_file(path)' ] },
        { head: 'Aufruf-Ergebnis · nur wenn genutzt (4k)', mode: 'od', lines: [
          '→ get_pull_request(1487)', '12 Files · +340 −88', 'title: "Fix token leak"' ] } ],
        cap: MCP_CAP() },
      nd: { kindlbl: 'Tool', file: 'Tool · filesystem', zones: [
        { head: 'Tool-Schemas · immer im Fenster (3k)', mode: 'always', lines: [
          'Tools (Signaturen):', '• list_files(dir)', '• read_file(path)', '• write_file(path, text)' ] },
        { head: 'Aufruf-Ergebnis · nur wenn genutzt (4k)', mode: 'od', lines: [
          '→ read_file("plan.md")', '842 Zeichen geladen' ] } ],
        cap: MCP_CAP() }
    },
    m_confluence: {
      dev: { kindlbl: 'MCP · Tool-Server', file: 'MCP · confluence', zones: [
        { head: 'Tool-Schemas · immer im Fenster (3k)', mode: 'always', lines: [
          'Tools (Signaturen):', '• get_page(id)', '• create_page(space, title, body)', '• search(query)' ] },
        { head: 'Aufruf-Ergebnis · nur wenn genutzt (4k)', mode: 'od', lines: [
          '→ create_page("ENG", …)', 'Seite angelegt · id 88213' ] } ],
        cap: MCP_CAP() },
      nd: { kindlbl: 'Tool', file: 'Tool · wiki', zones: [
        { head: 'Tool-Schemas · immer im Fenster (3k)', mode: 'always', lines: [
          'Tools (Signaturen):', '• get_page(id)', '• create_page(title, body)', '• search(query)' ] },
        { head: 'Aufruf-Ergebnis · nur wenn genutzt (4k)', mode: 'od', lines: [
          '→ create_page("Woche 23", …)', 'Seite angelegt' ] } ],
        cap: MCP_CAP() }
    },
    m_jira: {
      dev: { kindlbl: 'MCP · Tool-Server', file: 'MCP · jira', zones: [
        { head: 'Tool-Schemas · immer im Fenster (3k)', mode: 'always', lines: [
          'Tools (Signaturen):', '• search_issues(jql)', '• get_issue(key)', '• create_issue(fields)' ] },
        { head: 'Aufruf-Ergebnis · nur wenn genutzt (4k)', mode: 'od', lines: [
          '→ search_issues("status=Open")', '14 Tickets · 3 kritisch' ] } ],
        cap: MCP_CAP() },
      nd: { kindlbl: 'Tool', file: 'Tool · warehouse-db', zones: [
        { head: 'Tool-Schemas · immer im Fenster (3k)', mode: 'always', lines: [
          'Tools (Signaturen):', '• list_stock(sku)', '• get_item(id)', '• run_query(sql)' ] },
        { head: 'Aufruf-Ergebnis · nur wenn genutzt (4k)', mode: 'od', lines: [
          '→ list_stock("A-100")', 'Bestand: 42 · Min: 50' ] } ],
        cap: MCP_CAP() }
    }
  };
  function AGENT_CAP() { return 'Eine Agent-Definition ist <em>komplett on-demand</em> — sie kostet 0 Token, bis der Agent wirklich aufgerufen wird.'; }
  function SKILL_CAP() { return 'Nur die <em>Beschreibung</em> (Header) ist always-on. An ihr entscheidet das Modell, ob der <em>Body</em> geladen wird.'; }
  function MCP_CAP() { return 'Die <em>Tool-Schemas</em> liegen always-on im Fenster — schon <em>bevor</em> du ein Tool nutzt. Erst das <em>Ergebnis</em> eines Aufrufs kommt on-demand dazu.'; }

  function peekData(id) {
    var p = PEEK[id]; if (!p) return null;
    return (role === 'nondev' && p.nd) ? p.nd : p.dev;
  }

  var peekOverlay = document.createElement('div');
  peekOverlay.className = 'cg-peek-overlay';
  peekOverlay.hidden = true;
  peekOverlay.innerHTML = '<div class="cg-peek-backdrop"></div><div class="cg-peek-card" role="dialog" aria-modal="true"></div>';
  if (boardEl) boardEl.appendChild(peekOverlay);
  var peekCard = peekOverlay.querySelector('.cg-peek-card');

  function openPeek(id) {
    var d = peekData(id); if (!d) return;
    var isLoaded = (id === 'user') || !!loaded[id];
    var zones = d.zones.map(function (z) {
      var on = (z.mode === 'always') ? true : isLoaded;
      var stTxt = (z.mode === 'always') ? 'always-on' : (isLoaded ? 'geladen' : 'lädt on-demand');
      var lines = z.lines.map(function (ln) { return '<div class="cg-peek-line">' + esc(ln) + '</div>'; }).join('');
      return '<div class="cg-peek-zone ' + (on ? 'on' : 'off') + '">' +
        '<div class="cg-peek-zhead"><span>' + z.head + '</span>' +
        '<span class="cg-peek-state ' + (on ? 'on' : 'off') + '">' + stTxt + '</span></div>' +
        lines + '</div>';
    }).join('');
    peekCard.innerHTML =
      '<div class="cg-peek-head">' +
        '<span class="cg-peek-kind k-' + NODES[id].kind + '">' + d.kindlbl + '</span>' +
        '<span class="cg-peek-name">' + esc(R(NODES[id], 'label')) + '</span>' +
        '<button type="button" class="cg-peek-close" aria-label="schließen">✕</button>' +
      '</div>' +
      '<div class="cg-peek-file">' + esc(d.file) + '</div>' +
      '<div class="cg-peek-scroll">' + zones + '</div>' +
      '<div class="cg-peek-cap">' + d.cap + '</div>';
    peekOverlay.hidden = false;
    requestAnimationFrame(function () { peekOverlay.classList.add('show'); });
  }
  function closePeek() {
    peekOverlay.classList.remove('show');
    peekOverlay.hidden = true;
  }
  peekOverlay.addEventListener('click', function (e) {
    if (e.target.classList.contains('cg-peek-backdrop') || (e.target.closest && e.target.closest('.cg-peek-close'))) closePeek();
  });

  // ---------- SVG defs (once) ----------
  function buildDefs() {
    var ns2 = 'http://www.w3.org/2000/svg';
    var defs = document.createElementNS(ns2, 'defs');
    defs.innerHTML =
      '<marker id="cg-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="#c8421f"></path></marker>';
    svgEl.appendChild(defs);
  }

  // ---------- Geometry ----------
  function measure() {
    var cw = canvasEl.clientWidth, ch = canvasEl.clientHeight;
    var g = {};
    NODE_ORDER.forEach(function (id) {
      var el = nodeEls[id];
      g[id] = { cx: el.offsetLeft, cy: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    });
    return { cw: cw, ch: ch, g: g };
  }
  function anchor(node, tx, ty) {
    var dx = tx - node.cx, dy = ty - node.cy;
    var hw = node.w / 2 + 4, hh = node.h / 2 + 4;
    if (dx === 0 && dy === 0) return { x: node.cx, y: node.cy };
    var t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return { x: node.cx + dx * t, y: node.cy + dy * t };
  }
  var ns = 'http://www.w3.org/2000/svg';
  function rectDist(px, py, r) {
    var dx = Math.max(r.cx - r.w / 2 - px, 0, px - (r.cx + r.w / 2));
    var dy = Math.max(r.cy - r.h / 2 - py, 0, py - (r.cy + r.h / 2));
    return Math.hypot(dx, dy);
  }
  function directCtrl(m, A, B) {
    var agents = ['a_release', 'a_confluence', 'a_jira'].map(function (id) { return m.g[id]; });
    var ag = agents.slice().sort(function (p, q) { return p.cy - q.cy; });
    var colX = ag[1].cx;
    var sy = A.cy + (B.cy - A.cy) * ((colX - A.cx) / ((B.cx - A.cx) || 1));
    var pad = 28;
    var gaps = [
      { lo: ag[0].cy + ag[0].h / 2 + pad, hi: ag[1].cy - ag[1].h / 2 - pad },
      { lo: ag[1].cy + ag[1].h / 2 + pad, hi: ag[2].cy - ag[2].h / 2 - pad }
    ];
    var best = null;
    gaps.forEach(function (g) {
      var cy = Math.max(g.lo, Math.min(g.hi, sy));
      var ctrl = { x: colX, y: cy };
      var a = anchor(A, ctrl.x, ctrl.y), b = anchor(B, ctrl.x, ctrl.y);
      var minD = Infinity;
      for (var t = 0; t <= 1; t += 0.04) {
        var x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * ctrl.x + t * t * b.x;
        var y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * ctrl.y + t * t * b.y;
        agents.forEach(function (r) { minD = Math.min(minD, rectDist(x, y, r)); });
      }
      if (!best || minD > best.minD) best = { ctrl: ctrl, minD: minD };
    });
    return best.ctrl;
  }
  function drawEdge(m, e) {
    var A = m.g[e.from], B = m.g[e.to];
    if (!A || !B) return;
    var fromKind = NODES[e.from].kind, toKind = NODES[e.to].kind;
    var curved = (fromKind === 'user' && (toKind === 'skill' || toKind === 'mcp'));
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('class', 'cge on');
    p.setAttribute('marker-end', 'url(#cg-arrow)');
    var lp;
    if (curved) {
      var c = directCtrl(m, A, B);
      var a = anchor(A, c.x, c.y);
      var b = anchor(B, c.x, c.y);
      p.setAttribute('d', 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
        ' Q ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1));
      lp = { x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y };
    } else {
      var a2 = anchor(A, B.cx, B.cy);
      var b2 = anchor(B, A.cx, A.cy);
      p.setAttribute('d', 'M' + a2.x.toFixed(1) + ' ' + a2.y.toFixed(1) + ' L' + b2.x.toFixed(1) + ' ' + b2.y.toFixed(1));
      var mx = (a2.x + b2.x) / 2, my = (a2.y + b2.y) / 2;
      var dx = b2.x - a2.x, dy = b2.y - a2.y, len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len, ny = dx / len;
      if (ny > 0) { nx = -nx; ny = -ny; }
      lp = { x: mx + nx * 16, y: my + ny * 16 };
    }
    svgEl.appendChild(p);
    var txt = R(e, 'label');
    if (txt) {
      var lab = document.createElement('div');
      lab.className = 'cg-edge-label';
      lab.innerHTML = txt;
      lab.style.left = lp.x + 'px';
      lab.style.top = lp.y + 'px';
      labelsEl.appendChild(lab);
    }
  }

  // ---------- Layout / draw ----------
  function present(id) { return id === 'user' || !!loaded[id]; }
  function layout() {
    var m = measure();
    if (!m.cw || !m.ch) return;
    svgEl.setAttribute('viewBox', '0 0 ' + m.cw + ' ' + m.ch);
    [].slice.call(svgEl.querySelectorAll('.cge')).forEach(function (p) { p.remove(); });
    labelsEl.innerHTML = '';

    var task = currentTask();
    var req = requiredSet(task);

    // Kanten: nur zeichnen, wenn BEIDE Endpunkte tatsächlich geladen (bzw. user) sind
    if (task) task.edges.forEach(function (e) {
      if (present(e.from) && present(e.to)) drawEdge(m, e);
    });

    NODE_ORDER.forEach(function (id) {
      var el = nodeEls[id];
      el.classList.remove('on', 'dim', 'avail', 'loaded', 'ok', 'extra', 'missing');
      if (!task) return;                       // keine Aufgabe: neutral, nicht ziehbar
      if (id === 'user') { el.classList.add('on'); return; }
      var isLoaded = !!loaded[id], isReq = !!req[id];
      if (checked) {
        if (isLoaded && isReq) el.classList.add('loaded', 'ok');
        else if (isLoaded && !isReq) el.classList.add('loaded', 'extra');
        else if (!isLoaded && isReq) el.classList.add('missing');
        else el.classList.add('avail');
      } else {
        if (isLoaded) el.classList.add('loaded');
        else el.classList.add('avail');
      }
    });
  }

  // ---------- Click-to-activate ----------
  function onNodeClick(id) {
    if (!selected) { flashPicker(); return; }
    setLoaded(id, !loaded[id]);   // Klick togglet: laden ↔ entladen
  }
  function setLoaded(id, on) {
    if (on) loaded[id] = true; else delete loaded[id];
    checked = false;
    syncButtons();
    paintGrabHints();
    layout();
    renderTrace();
  }
  function flashPicker() {
    triggerEl.classList.remove('flash');
    void triggerEl.offsetWidth;
    triggerEl.classList.add('flash');
  }

  // ---------- Context panel ----------
  function fmtK(t) { var k = t / 1000; return (k >= 10 ? Math.round(k) : Math.round(k * 10) / 10) + 'k'; }
  function cells(t) { return Math.max(0, Math.round(t / 1000)); }
  function iconFor(kind) { return kind === 'agent' ? 'A' : kind === 'skill' ? 'S' : 'T'; }
  function nm(id) { return R(NODES[id], 'label'); }

  function odItems() {
    var out = [];
    loadedIds().forEach(function (id) {
      var n = NODES[id];
      out.push({ id: id, kind: n.kind, label: R(n, 'label'),
        sub: n.kind === 'agent' ? 'Agent-Definition' : n.kind === 'skill' ? 'Skill-Body' : 'Tool-Ergebnis',
        tok: OD_TOK[n.kind] });
    });
    out.sort(function (a, b) { return (KIND_ORDER[a.kind] - KIND_ORDER[b.kind]) || (NODE_ORDER.indexOf(a.id) - NODE_ORDER.indexOf(b.id)); });
    return out;
  }

  function legRow(o) {
    return '<div class="cg-leg2-row">' +
      '<span class="cg-leg2-sw ' + o.cls + '"></span>' +
      '<span class="cg-leg2-label">' + o.label +
        '<span class="cg-leg2-sub">' + o.sub + '</span></span>' +
      '<span class="cg-leg2-tok">' + fmtK(o.tok) + '</span></div>';
  }

  function gridCells(od, freeCells) {
    var h = '';
    ALWAYS.forEach(function (a) {
      for (var i = 0; i < cells(a.tok); i++) h += '<span class="cg-cell ' + a.cls + '"></span>';
    });
    // alle 4 MCP-Schemas liegen IMMER im Fenster (gefüllt = genutzt, Umriss = ungenutzt)
    var usedMcp = {};
    od.forEach(function (o) { if (o.kind === 'mcp') usedMcp[o.id] = true; });
    MCP_IDS.forEach(function (id) {
      var used = !!usedMcp[id];
      for (var i = 0; i < cells(MCP_SCHEMA_TOK); i++) {
        h += '<span class="cg-cell mcp' + (used ? '' : ' mcp-idle') + '"></span>';
      }
    });
    od.forEach(function (o) {
      var extra = checked && !requiredSet(currentTask())[o.id];
      for (var i = 0; i < cells(o.tok); i++) h += '<span class="cg-cell ' + (extra ? 'od-x' : 'od') + '"></span>';
    });
    for (var f = 0; f < freeCells; f++) h += '<span class="cg-cell"></span>';
    return h;
  }

  function dropZoneHtml(od) {
    var inner, sum;
    if (!selected) {
      inner = '<div class="cg-drop-empty">Wähle zuerst oben eine Aufgabe.</div>';
      sum = '–';
    } else if (!od.length) {
      inner = '<div class="cg-drop-empty">Klicke im Graph die nötigen Knoten an. Nur was die Aufgabe wirklich braucht.</div>';
      sum = '0 Posten';
    } else {
      var req = requiredSet(currentTask());
      inner = od.map(function (o) {
        var extra = checked && !req[o.id];
        return '<div class="cg-drop-item k-' + o.kind + (extra ? ' is-extra' : '') + '">' +
          '<span class="di-icon">' + iconFor(o.kind) + '</span>' +
          '<span class="di-text"><span class="di-label">' + o.label + '</span>' +
            '<span class="di-sub">' + o.sub + (extra ? ' · nicht nötig' : '') + '</span></span>' +
          '<span class="di-tok">' + fmtK(o.tok) + '</span>' +
          '<span class="di-x" role="button" tabindex="0" data-unload="' + o.id + '" aria-label="entfernen">✕</span></div>';
      }).join('');
      var t = od.reduce(function (s, o) { return s + o.tok; }, 0);
      sum = fmtK(t) + ' · ' + od.length + ' Posten';
    }
    return '<div class="cg-drop" id="cgraph-drop">' +
      '<div class="cg-drop-head"><span>Du lädst · für die Aufgabe</span><span>' + sum + '</span></div>' +
      inner + '</div>';
  }

  function wasteBox(cls, ic, tx) {
    return '<div class="cg-waste ' + cls + '"><span class="cg-waste-ic">' + ic + '</span>' +
      '<span class="cg-waste-tx">' + tx + '</span></div>';
  }

  function feedbackHtml() {
    var task = currentTask();
    if (!task) {
      return wasteBox('', '!', 'Schon <b>vor dem ersten Klick</b> liegen <b>' + fmtK(ALWAYS_TOK) + '</b> im Fenster — inkl. aller <b>4 MCP-Schemas (12k)</b>. Diese Basis ist always-on; du lädst nur, was <em>obendrauf</em> kommt.');
    }
    if (!checked) {
      return wasteBox('', '!', 'Alle 4 MCP-Schemas (12k) liegen bereits im Fenster — ob genutzt oder nicht. Lade jetzt nur die Knoten, die <b>diese</b> Aufgabe braucht, und drücke <b>Prüfen</b>.');
    }
    var req = requiredSet(task);
    var missing = Object.keys(req).filter(function (id) { return !loaded[id]; });
    var extra = loadedIds().filter(function (id) { return !req[id]; });
    if (!missing.length && !extra.length) {
      var nReq = Object.keys(req).length;
      if (nReq === 0) {
        return wasteBox('ok', '✓', '<b>Genau richtig.</b> Diese Aufgabe braucht <b>keinen</b> zusätzlichen Knoten — nur den always-on Turn. Jeder geladene Posten wäre verschenkt gewesen.');
      }
      return wasteBox('ok', '✓', '<b>Genau richtig</b> — die ' + nReq + ' nötigen Posten, kein Token zu viel. Genau diese Knoten feuern für die Aufgabe.');
    }
    var parts = [];
    if (missing.length) {
      parts.push('<b>Fehlt:</b> ' + missing.map(nm).join(', ') + ' — ohne das läuft die Aufgabe nicht.');
    }
    if (extra.length) {
      var extraTok = extra.reduce(function (s, id) { return s + OD_TOK[NODES[id].kind]; }, 0);
      parts.push('<b>Zu viel:</b> ' + extra.map(nm).join(', ') + ' — ' + fmtK(extraTok) + ' Kontext ohne Gegenwert.');
    }
    var cls = missing.length ? 'bad' : '';
    var ic = missing.length ? '×' : '!';
    return wasteBox(cls, ic, parts.join(' '));
  }

  function renderTrace() {
    var od = odItems();
    var odTok = od.reduce(function (s, o) { return s + o.tok; }, 0);
    var usedTok = ALWAYS_TOK + odTok;
    var pct = Math.round(usedTok / WINDOW_TOK * 100);

    var totalCells = Math.round(WINDOW_TOK / 1000);
    var alwaysCells = ALWAYS.reduce(function (s, a) { return s + cells(a.tok); }, 0);
    var mcpCells = MCP_IDS.length * cells(MCP_SCHEMA_TOK);
    var odCells = od.reduce(function (s, o) { return s + cells(o.tok); }, 0);
    var freeCells = Math.max(0, totalCells - alwaysCells - mcpCells - odCells);

    var awPct = ALWAYS_TOK / WINDOW_TOK * 100;
    var odPct = odTok / WINDOW_TOK * 100;
    var head =
      '<div class="cg-gauge">' +
        '<span class="cg-gauge-used"><b>' + fmtK(usedTok) + '</b> / ' + fmtK(WINDOW_TOK) + '</span>' +
        '<span class="cg-gauge-pct">' + pct + '% belegt</span>' +
      '</div>' +
      '<div class="cg-bar"><i class="b-always" style="width:' + awPct.toFixed(2) + '%"></i>' +
        '<i class="b-od" style="width:' + odPct.toFixed(2) + '%"></i></div>';

    var grid = '<div class="cg-grid">' + gridCells(od, freeCells) + '</div>';

    var baseLeg =
      '<div class="cg-leg2"><div class="cg-leg2-group">' +
        '<div class="cg-ctx-head"><span class="cg-leg-tag im">Immer geladen</span>' + fmtK(ALWAYS_TOK) + ' · jeder Turn</div>' +
        ALWAYS.map(legRow).join('') +
        legRow({ cls: 'mcp', label: 'MCP-Schemas · 4×', sub: 'alle 4 immer im Fenster — ob genutzt oder nicht', tok: MCP_IDS.length * MCP_SCHEMA_TOK }) +
      '</div>' +
      '<div class="cg-leg2-row cg-leg2-free">' +
        '<span class="cg-leg2-sw free"></span>' +
        '<span class="cg-leg2-label">Frei · unbelegt<span class="cg-leg2-sub">Rest des 200k-Fensters — noch Platz</span></span>' +
        '<span class="cg-leg2-tok">' + fmtK(Math.max(0, WINDOW_TOK - usedTok)) + '</span>' +
      '</div></div>';

    traceEl.innerHTML = head + grid + baseLeg + feedbackHtml();

    // Einsicht: erst nach KORREKTEM Prüfen (Belohnung)
    var task = currentTask();
    if (task && checked) {
      var req = requiredSet(task);
      var ok = Object.keys(req).every(function (id) { return loaded[id]; }) &&
               loadedIds().every(function (id) { return req[id]; });
      if (ok) {
        insightEl.innerHTML = '<div class="cg-insight-label">Einsicht</div><div class="cg-insight-text">' + R(task, 'insight') + '</div>';
        insightEl.hidden = false;
      } else { insightEl.innerHTML = ''; insightEl.hidden = true; }
    } else { insightEl.innerHTML = ''; insightEl.hidden = true; }
  }

  // ---------- Task dropdown ----------
  function plain(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function renderTasks() {
    var cur = currentTask();
    triggerTextEl.textContent = cur ? plain(R(cur, 'name')) : '— Aufgabe wählen —';
    triggerEl.classList.toggle('is-placeholder', !cur);
    menuEl.innerHTML = TASKS.map(function (t) {
      var isSel = selected === t.id;
      return '<button type="button" class="cgp-option' + (isSel ? ' is-selected' : '') +
        '" role="option" aria-selected="' + (isSel ? 'true' : 'false') + '" data-id="' + t.id + '">' +
        '<span class="cgp-opt-text">' + plain(R(t, 'name')) + '</span>' +
        '<span class="cgp-opt-check" aria-hidden="true"></span>' +
        '</button>';
    }).join('');
  }
  function syncButtons() {
    if (checkBtn) checkBtn.disabled = !(selected && loadedIds().length >= 0 && loadedIds().length + 0 >= 0) || !selected;
    if (checkBtn) checkBtn.disabled = !selected;
    if (clearBtn) clearBtn.disabled = !loadedIds().length;
  }

  // ---------- Dropdown open/close ----------
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
    selected = opt.getAttribute('data-id') || null;
    loaded = {}; checked = false;
    closeMenu();
    renderTasks(); syncButtons(); layout(); renderTrace();
  });
  document.addEventListener('click', function (e) {
    if (!ddEl.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); closePeek(); }
  });
  if (resetBtn) resetBtn.addEventListener('click', function () {
    selected = TASKS[0].id; loaded = {}; checked = false;
    renderTasks(); syncButtons(); layout(); renderTrace();
  });
  if (clearBtn) clearBtn.addEventListener('click', function () {
    loaded = {}; checked = false;
    syncButtons(); layout(); renderTrace();
  });
  if (checkBtn) checkBtn.addEventListener('click', function () {
    if (!selected) { flashPicker(); return; }
    checked = true;
    layout(); renderTrace();
  });

  // ---------- Role change ----------
  section.addEventListener('rolechange', function (e) {
    role = e.detail.role;
    paintNodeText(); renderTasks(); layout(); renderTrace();
  });

  // ---------- Resize ----------
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { layout(); });
    ro.observe(canvasEl);
  }
  window.addEventListener('resize', layout);

  // ---------- Init ----------
  buildDefs();
  buildNodes();
  paintGrabHints();
  renderTasks();
  syncButtons();
  renderTrace();
  requestAnimationFrame(layout);
})();
