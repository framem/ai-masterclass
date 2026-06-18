/**
 * Exercise 2a — System-Prompt Doctor
 * The system prompt is paid in EVERY call. Sweet spot: high score, low tokens.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="Agent-Prompt-Doctor"]');
  if (!section) return;

  var BASE_PROMPT = 'Du bist ein Assistent.';
  var BASE_TOKENS = 7;
  var BASE_SCORE = 1.5;

  // The concrete assignment the learner is building toward (switches with role)
  var BRIEF = {
    dev: {
      scale: 'läuft bei jedem Doku-Auftrag',
      goal: 'Du baust den Prompt für einen <strong>API-Doku-Assistenten</strong>, den das Entwickler-Team <strong>dauerhaft für genau diese eine Aufgabe</strong> einsetzt: aus Endpunkt-Notizen saubere Referenz-Doku machen. Den Prompt schreibst du <strong>einmal</strong> — er läuft danach bei <strong>jedem</strong> Doku-Auftrag des Teams, immer gleich, ohne Nachjustieren. Über die Zeit summiert sich das auf <strong>tausende Chat-Nachrichten</strong>.',
      out: '<span class="dbo-k">Soll-Ausgabe:</span> Markdown · ## je Endpunkt · cURL-Beispiel · nie Endpunkte erfinden'
    },
    nondev: {
      scale: 'läuft bei jeder Antwort-Mail',
      goal: 'Du baust den Prompt für einen <strong>Mail-Assistenten im Kundenservice</strong>, den das Support-Team <strong>dauerhaft für genau diese eine Aufgabe</strong> einsetzt: aus knappen Stichpunkten der Mitarbeitenden (z.&nbsp;B. <em>„Lieferung verspätet · neuer Termin Fr · 10€-Gutschein"</em>) fertige, freundliche <strong>Antwort-Mails an Kund:innen</strong> formulieren. Den Prompt schreibst du <strong>einmal</strong> — er läuft danach bei <strong>jeder</strong> Antwort-Mail des Teams, immer gleich, ohne Nachjustieren. Über die Zeit summiert sich das auf <strong>tausende Chat-Nachrichten</strong>.',
      out: '<span class="dbo-k">Soll-Ausgabe:</span> Betreff · kurze Absätze · To-do-Liste · nie Zahlen erfinden'
    }
  };

  // 6 building blocks for system prompts
  var FIXES = [
    {
      id: 'role',
      name: 'Rolle / Identität',
      meta: 'Wer ist der Agent?',
      label: 'ROLLE',
      addition: 'Du bist ein erfahrener Tech-Writer, spezialisiert auf REST-API-Dokumentation für Entwickler-Teams.',
      addition_nd: 'Du bist eine erfahrene Referentin, spezialisiert auf klare Geschäftskorrespondenz für interne Fachabteilungen.',
      score: 1.5,
      tokens: 28,
      recommended: true
    },
    {
      id: 'tools',
      name: 'Tools / Capabilities',
      meta: 'Was darfst du tun?',
      label: 'TOOLS',
      addition: 'Verfügbare Tools: read_file, search_docs, run_lint. Bei Bedarf rückfragen, bevor du Tools nutzt.',
      addition_nd: 'Verfügbare Tools: dokument_lesen, vorlagen_suchen, fakten_prüfen. Bei Bedarf rückfragen, bevor du Tools nutzt.',
      score: 1.0,
      tokens: 32,
      recommended: true
    },
    {
      id: 'format',
      name: 'Output-Format (Default)',
      meta: 'Wie sieht die Standardausgabe aus?',
      label: 'FORMAT',
      addition: 'Standard: Markdown mit ## Heading je Endpunkt, ```bash für cURL-Beispiele, keine Smalltalk-Einleitungen.',
      addition_nd: 'Standard: klare Betreffzeile, kurze Absätze, Aufzählungen für To-dos, keine Smalltalk-Einleitungen.',
      score: 1.6,
      tokens: 30,
      recommended: true
    },
    {
      id: 'rules',
      name: 'Verhaltens-Regeln',
      meta: 'Bei welcher Situation, was tun?',
      label: 'REGELN',
      addition: 'Bei Unklarheit: rückfragen, nicht raten. Bei deprecated Endpunkten: markieren, nicht ignorieren. Nie Endpunkte erfinden — wenn nicht in der Quelle, sagen.',
      addition_nd: 'Bei Unklarheit: rückfragen, nicht raten. Bei veralteten Angaben: markieren, nicht ignorieren. Nie Zahlen erfinden — wenn nicht in der Quelle, sagen.',
      score: 1.8,
      tokens: 44,
      recommended: true
    },
    {
      id: 'examples',
      name: 'Few-Shot Beispiel',
      meta: 'Wie sieht „gut" aus?',
      label: 'BEISPIEL',
      addition: 'Beispiel:\n## /users/{id}\nGET /users/{id} — Liest einen Nutzer.\n```bash\ncurl -H "Auth: Bearer $T" https://api.x/users/42\n```',
      addition_nd: 'Beispiel:\nBetreff: Freigabe Q3-Report\nHallo Team, der Q3-Report liegt zur Freigabe bereit.\n- Frist: Freitag\n- Rückfragen an: Anna',
      score: 0.7,
      tokens: 92,
      costly: true,
      note: 'Schlechter Deal <strong>hier</strong>: <strong>+92 tok für nur +0,7 Score</strong> — und das fließt in <strong>jede</strong> Chat-Nachricht (× tausende). Format &amp; Regeln liefern dieselbe Konsistenz für einen Bruchteil. Konkrete Beispiele gehören eher in den User-Prompt, nicht ins persistente System-Prompt.'
    },
    {
      id: 'style',
      name: 'Ton / Stil',
      meta: 'Wie soll es klingen?',
      label: 'STIL',
      addition: 'Ton: knapp, technisch, keine Marketing-Phrasen wie „modern" oder „state-of-the-art".',
      addition_nd: 'Ton: knapp, sachlich, keine Marketing-Phrasen wie „nahtlos" oder „Game-Changer".',
      score: 0.5,
      tokens: 22,
      recommended: true
    }
  ];

  // Elements
  var briefEl = section.querySelector('#sysdoc-brief');
  var textEl = section.querySelector('#sysdoc-text');
  var scoreEl = section.querySelector('#sysdoc-score');
  var scoreBar = section.querySelector('#sysdoc-score-bar');
  var tokensEl = section.querySelector('#sysdoc-tokens');
  var tokensBar = section.querySelector('#sysdoc-tokens-bar');
  var percallEl = section.querySelector('#sysdoc-percall');
  var percallBar = section.querySelector('#sysdoc-percall-bar');
  var fixesListEl = section.querySelector('#sysdoc-fixes-list');
  var activeCountEl = section.querySelector('#sysdoc-active-count');
  var sweetEl = section.querySelector('#sysdoc-sweet');
  var resetBtn = section.querySelector('#sysdoc-reset');
  var solveBtn = section.querySelector('#sysdoc-solve');

  var state = {};
  FIXES.forEach(function (f) { state[f.id] = false; });
  var revealed = false;

  var role = 'dev';
  function add(f) { return role === 'nondev' ? f.addition_nd : f.addition; }

  function render() {
    solveBtn.textContent = revealed ? 'Bearbeiten' : 'Prüfen';
    var b = BRIEF[role === 'nondev' ? 'nondev' : 'dev'];
    briefEl.innerHTML =
      '<div class="doctor-brief-goal">' + b.goal + '</div>';

    var anyFixed = FIXES.some(function (f) { return state[f.id]; });

    // Text panel rendered as the AGENTS.md file. Unlike a Skill (where only the
    // frontmatter is always-on), the WHOLE agent prompt is always-on.
    var lines = [];
    var agentFile = (role === 'nondev') ? 'email.agent.md' : 'api-docu.agent.md';
    lines.push(
      '<div class="sd-filebar">' +
        '<span class="sd-dot"></span>' +
        '<span class="sd-filename">' + agentFile + '</span>' +
      '</div>'
    );
    lines.push('<div class="sd-pad">');
    // The vague base prompt is shown until the first building block replaces it.
    if (!anyFixed) {
      lines.push('<div class="doctor-line label">BASIS</div>');
      lines.push('<div class="doctor-line base">' + BASE_PROMPT + '</div>');
    }
    FIXES.forEach(function (f) {
      if (state[f.id]) {
        lines.push('<div class="doctor-line label">' + f.label + '</div>');
        lines.push('<div class="doctor-line added">' + escapeHtml(add(f)).replace(/\n/g, '<br/>') + '</div>');
      }
    });
    lines.push('</div>');
    textEl.innerHTML = lines.join('');
    wireCopy();

    // Fixes
    fixesListEl.innerHTML = '';
    FIXES.forEach(function (f) {
      var on = state[f.id];
      var div = document.createElement('div');
      div.className = 'doctor-fix' + (on ? ' on' : '') + (f.costly ? ' costly' : '') + (revealed && f.recommended ? ' recommended' : '');
      var badge = '';
      if (revealed && f.costly) badge = ' <span style="color: var(--warn); font-family: var(--mono); font-size: 10px;">·  ⚠ WEGLASSEN</span>';
      else if (revealed && f.recommended) badge = ' <span style="color: #7bc98a; font-family: var(--mono); font-size: 10px;">·  ✓ EMPFOHLEN</span>';
      div.innerHTML =
        '<div class="doctor-fix-head">' +
          '<div class="doctor-fix-name">' + f.name + badge + '</div>' +
          '<div class="doctor-fix-check">' + (on ? '✓' : '') + '</div>' +
        '</div>' +
        '<div style="font-size: 12px; color: #c8c2b6; margin-bottom: 6px;">' + f.meta + '</div>' +
        '<div class="doctor-fix-meta">' +
          '<span class="qm-up">+ ' + f.score.toFixed(1) + ' Score</span>' +
          '<span' + (revealed && f.costly ? ' style="color: var(--warn);"' : '') + '>+ ' + f.tokens + ' tok/Nachricht</span>' +
        '</div>' +
        ((revealed && f.note) ? '<div class="doctor-fix-note">' + f.note + '</div>' : '');
      div.addEventListener('click', function () {
        state[f.id] = !state[f.id];
        render();
      });
      fixesListEl.appendChild(div);
    });

    // Meters
    var score = BASE_SCORE;
    var tokens = BASE_TOKENS;
    var activeCount = 0;
    FIXES.forEach(function (f) {
      if (state[f.id]) {
        score += f.score;
        tokens += f.tokens;
        activeCount++;
      }
    });
    score = Math.min(10, score);

    scoreEl.textContent = score.toFixed(1) + ' / 10';
    scoreBar.style.width = (score * 10) + '%';
    scoreEl.classList.remove('ok', 'warn', 'bad');
    if (score >= 7) scoreEl.classList.add('ok');
    else if (score >= 5) scoreEl.classList.add('warn');
    else scoreEl.classList.add('bad');

    tokensEl.textContent = '~' + tokens + ' tok';
    var tokenBudget = 300;
    var pct = Math.min(100, (tokens / tokenBudget) * 100);
    tokensBar.style.width = pct + '%';
    tokensBar.parentNode.classList.remove('warn', 'bad');
    tokensEl.classList.remove('ok', 'warn', 'bad');
    if (tokens > 200) { tokensBar.parentNode.classList.add('bad'); tokensEl.classList.add('bad'); }
    else if (tokens > 120) { tokensBar.parentNode.classList.add('warn'); tokensEl.classList.add('warn'); }
    else { tokensEl.classList.add('ok'); }

    // Per-call cost emphasis: cost × 1000 calls
    var costPer1k = tokens * 1000;
    percallEl.textContent = (costPer1k / 1000).toFixed(0) + 'k tok';
    percallBar.style.width = Math.min(100, (costPer1k / 300000) * 100) + '%';

    // Sweet spot
    activeCountEl.textContent = activeCount + ' von ' + FIXES.length + ' aktiv';
    var inSweet = score >= 7 && tokens <= 180;
    if (inSweet) {
      sweetEl.classList.add('hit');
      sweetEl.innerHTML = '✓ <span style="color: #fff;">Sweet-Spot!</span> Score ' + score.toFixed(1) + ' bei ' + tokens + ' tok/Nachricht';
    } else {
      sweetEl.classList.remove('hit');
      if (score >= 7 && tokens > 180) {
        sweetEl.textContent = 'Score ok — aber pro Chat-Nachricht zu teuer (' + tokens + ' > 180)';
      } else if (score < 7 && tokens <= 180) {
        sweetEl.textContent = 'Tokens ok — Score noch zu niedrig (' + score.toFixed(1) + ')';
      } else if (activeCount === 0) {
        sweetEl.innerHTML = '— Schalte Blöcke an. Denke daran: <em>jeder Token zählt × N Chat-Nachrichten</em>.';
      } else {
        sweetEl.textContent = 'Score ' + score.toFixed(1) + ', Tokens ' + tokens + ' — Sweet-Spot verfehlt.';
      }
    }

  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // The assembled AGENTS.md as paste-ready plain text.
  function plainText() {
    var on = FIXES.filter(function (f) { return state[f.id]; });
    if (!on.length) return BASE_PROMPT;
    return on.map(function (f) { return add(f); }).join('\n\n');
  }
  function wireCopy() {
    var btn = textEl.querySelector('.sd-copy');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var text = plainText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)['catch'](function () { fallbackCopy(text); });
      } else { fallbackCopy(text); }
      btn.classList.add('done');
      btn.textContent = '✓ Kopiert';
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.classList.remove('done'); btn.textContent = '⧉ Kopieren'; }, 1600);
    });
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  resetBtn.addEventListener('click', function () {
    FIXES.forEach(function (f) { state[f.id] = false; });
    revealed = false;
    render();
  });

  solveBtn.addEventListener('click', function () {
    // Prüfen = die EIGENE Auswahl bewerten (nicht überschreiben). Erneut: zurück zum Bearbeiten.
    revealed = !revealed;
    render();
  });

  section.addEventListener('rolechange', function (e) { role = e.detail.role; render(); });

  render();
})();
