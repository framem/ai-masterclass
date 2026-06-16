/**
 * Exercise 2c — Skill-Prompt Doctor
 * The counterpart to the Agent-Prompt: a Skill is DORMANT.
 * Only its short DESCRIPTION is always-on (paid in every chat message,
 * because it's what tells the model the skill exists). The full BODY loads
 * on-demand — paid only when the skill actually fires. So the lesson flips:
 * keep the description tiny, but the body MAY be detailed (examples welcome).
 */
(function () {
  var section = document.querySelector('[data-screen-label*="Skill-Prompt-Doctor"]');
  if (!section) return;

  var BASE_NAME = 'name: changelog-generator';
  var BASE_NAME_ND = 'name: monats-report';
  var BASE_ALWAYS = 6;   // the name itself sits in the always-on frontmatter
  var BASE_SCORE = 1.0;
  var ALWAYS_BUDGET = 35; // sweet spot: description must stay under this

  var BRIEF = {
    dev: {
      goal: 'Du schreibst einen <strong>Skill</strong> („Changelog-Generator"), den das Team <strong>on-demand</strong> nutzt — nur beim Release (<strong>feuert ~30×/Monat</strong>). Nur der <strong>Header</strong> (Name + Beschreibung) ist <strong>always-on</strong>; der <strong>Body</strong> wird <strong>lazy</strong> geladen, erst wenn der Skill <strong>feuert</strong>.',
      out: '<span class="dbo-k">Skill soll erzeugen:</span> Markdown-Changelog · nach feat/fix/breaking gruppiert · Beispiel inklusive'
    },
    nondev: {
      goal: 'Du schreibst einen <strong>Skill</strong> („Monats-Report"), den die Fachabteilung <strong>on-demand</strong> nutzt — einmal im Monat (<strong>feuert ~12×/Monat</strong>). Nur der <strong>Header</strong> (Name + Beschreibung) ist dauerhaft geladen; der <strong>Body</strong> kommt erst, wenn der Skill <strong>feuert</strong>.',
      out: '<span class="dbo-k">Skill soll erzeugen:</span> Monatsbericht · Ist-gegen-Plan je Abteilung · Top-3-Abweichungen · Beispiel inklusive'
    }
  };

  // bucket: 'always' = lives in the description (paid every message)
  //         'body'   = lives in the skill body (paid only when triggered)
  var FIXES = [
    {
      id: 'desc',
      name: 'Beschreibung / Trigger',
      meta: 'Wann lädt der Skill? (always-on)',
      label: 'BESCHREIBUNG · ALWAYS-ON',
      bucket: 'always',
      addition: 'description: Erzeugt einen sauberen Changelog aus Git-Commits. Nutze, wenn nach Release-Notes oder einem Changelog gefragt wird.',
      addition_nd: 'description: Erstellt den Monats-Report aus den Roh-Kennzahlen. Nutze, wenn ein Monats- oder Quartalsbericht angefragt wird.',
      score: 2.2,
      tokens: 24,
      recommended: true
    },
    {
      id: 'scope',
      name: 'Wann NICHT anwenden',
      meta: 'Abgrenzung — verhindert Fehlauslöser',
      label: 'SCOPE',
      bucket: 'body',
      addition: 'Nicht anwenden bei einzelnen Commit-Messages oder Code-Reviews — nur für Release-Changelogs.',
      addition_nd: 'Nicht anwenden für Tages-Updates oder Ad-hoc-Fragen — nur für den festen Monatsbericht.',
      score: 1.0,
      tokens: 22,
      recommended: true
    },
    {
      id: 'steps',
      name: 'Schritt-für-Schritt-Prozedur',
      meta: 'Der eigentliche Ablauf',
      label: 'PROZEDUR',
      bucket: 'body',
      addition: 'Schritte:\n1. git log seit dem letzten Tag lesen\n2. nach feat / fix / breaking gruppieren\n3. je Gruppe eine Bullet-Liste\n4. Breaking Changes nach oben.',
      addition_nd: 'Schritte:\n1. Rohzahlen je Abteilung einlesen\n2. Ist gegen Plan rechnen\n3. Top-3-Abweichungen markieren\n4. Kurz-Fazit nach oben.',
      score: 2.4,
      tokens: 78,
      recommended: true
    },
    {
      id: 'example',
      name: 'Konkretes Beispiel (Few-Shot)',
      meta: 'Wie sieht „gut" aus?',
      label: 'BEISPIEL',
      bucket: 'body',
      addition: 'Beispiel:\n## v2.1.0 — 2026-05-30\n### Features\n- Refresh-Token-Flow (a1b2c3d)\n### Fixes\n- Race in authMiddleware (e4f5g6h)',
      addition_nd: 'Beispiel:\n# Monats-Report Mai\n## Vertrieb\n- Ist 1,2 Mio € · Plan 1,0 Mio € (+20 %)\n## Support\n- Ticket-Quote 94 % · Plan 90 %',
      score: 2.0,
      tokens: 96,
      recommended: true,
      note: 'Anders als beim <strong>Agent-Prompt</strong>: hier lohnt sich das Beispiel. Es kostet nur, wenn der Skill wirklich <strong>feuert</strong> — nicht bei jeder Chat-Nachricht. On-demand darf ausführlich sein.'
    },
    {
      id: 'format',
      name: 'Output-Format',
      meta: 'Struktur der Ausgabe',
      label: 'FORMAT',
      bucket: 'body',
      addition: 'Format: Markdown, ## Version + Datum, ### je Gruppe, jede Änderung ein Bullet mit Commit-Kurz-Hash.',
      addition_nd: 'Format: Titel + Monat, ## je Abteilung, Kennzahl als „Ist vs Plan", Fazit als 3 Bullets.',
      score: 1.4,
      tokens: 34,
      recommended: true
    },
    {
      id: 'cram',
      name: 'Ganze Anleitung in die Beschreibung',
      meta: 'Alles in die Trigger-Zeile quetschen',
      label: 'BESCHREIBUNG · ALWAYS-ON',
      bucket: 'always',
      addition: 'description: Changelog-Generator. Liest git log, gruppiert nach feat/fix/breaking, baut Markdown mit ## je Version, ### je Gruppe, Bullets mit Hash, Breaking oben. Beispiel: ## v2.1.0 ...',
      addition_nd: 'description: Monats-Report. Liest Rohzahlen je Abteilung, rechnet Ist gegen Plan, markiert Top-3-Abweichungen, baut Tabelle plus Fazit. Beispiel: # Report Mai ...',
      score: 0.4,
      tokens: 88,
      costly: true,
      note: 'Die Beschreibung ist <strong>always-on</strong> — sie liegt in <strong>jeder</strong> Chat-Nachricht. Die ganze Prozedur hier reinzupacken macht den Skill so teuer wie ein Agent-Prompt und killt den On-demand-Vorteil. Prozedur &amp; Beispiel gehören in den <strong>Body</strong>.'
    }
  ];

  // Elements
  var briefEl = section.querySelector('#skilldoc-brief');
  var textEl = section.querySelector('#skilldoc-text');
  var charcountEl = section.querySelector('#skilldoc-charcount');
  var scoreEl = section.querySelector('#skilldoc-score');
  var scoreBar = section.querySelector('#skilldoc-score-bar');
  var alwaysEl = section.querySelector('#skilldoc-always');
  var alwaysBar = section.querySelector('#skilldoc-always-bar');
  var bodyEl = section.querySelector('#skilldoc-body');
  var bodyBar = section.querySelector('#skilldoc-body-bar');
  var fixesListEl = section.querySelector('#skilldoc-fixes-list');
  var activeCountEl = section.querySelector('#skilldoc-active-count');
  var sweetEl = section.querySelector('#skilldoc-sweet');
  var resetBtn = section.querySelector('#skilldoc-reset');
  var solveBtn = section.querySelector('#skilldoc-solve');

  var state = {};
  FIXES.forEach(function (f) { state[f.id] = false; });
  var revealed = false;
  var role = 'dev';

  function add(f) { return role === 'nondev' ? f.addition_nd : f.addition; }
  function baseName() { return role === 'nondev' ? BASE_NAME_ND : BASE_NAME; }

  function render() {
    solveBtn.textContent = revealed ? 'Lösung ausblenden' : 'Auflösen';
    var b = BRIEF[role === 'nondev' ? 'nondev' : 'dev'];
    briefEl.innerHTML =
      '<div class="doctor-brief-head"><span>Dein Auftrag</span></div>' +
      '<div class="doctor-brief-goal">' + b.goal + '</div>' +
      '<div class="doctor-brief-out">' + b.out + '</div>';

    // Text panel rendered as a real SKILL.md file:
    //   filename bar → frontmatter HEADER (between ---, always-on) → BODY (on-demand)
    var filePath = role === 'nondev' ? 'skills/monats-report/' : 'skills/changelog-generator/';
    var lines = [];
    lines.push(
      '<div class="sd-filebar">' +
        '<span class="sd-dot"></span>' +
        '<span class="sd-filename">SKILL.md</span>' +
        '<span class="sd-filepath">' + filePath + '</span>' +
        '<button class="sd-copy" type="button">⧉ Kopieren</button>' +
      '</div>'
    );
    lines.push('<div class="sd-pad">');

    // HEADER — YAML frontmatter, fenced by ---, always-on
    lines.push('<div class="sd-frontmatter">');
    lines.push('<div class="doctor-line fm-delim">---</div>');
    lines.push('<div class="doctor-line base">' + baseName() + '</div>');
    FIXES.forEach(function (f) {
      if (state[f.id] && f.bucket === 'always') {
        lines.push('<div class="doctor-line added' + (f.costly ? ' trap' : '') + '">' + escapeHtml(add(f)).replace(/\n/g, '<br/>') + '</div>');
      }
    });
    lines.push('<div class="doctor-line fm-delim">---</div>');
    lines.push('</div>'); // .sd-frontmatter

    // BODY — markdown below the frontmatter, on-demand
    FIXES.forEach(function (f) {
      if (state[f.id] && f.bucket === 'body') {
        lines.push('<div class="doctor-line label">' + f.label + '</div>');
        lines.push('<div class="doctor-line added">' + escapeHtml(add(f)).replace(/\n/g, '<br/>') + '</div>');
      }
    });
    lines.push('</div>'); // .sd-pad
    textEl.innerHTML = lines.join('');
    wireCopy();

    // Fixes list
    fixesListEl.innerHTML = '';
    FIXES.forEach(function (f) {
      var on = state[f.id];
      var isAlways = f.bucket === 'always';
      var div = document.createElement('div');
      div.className = 'doctor-fix' + (on ? ' on' : '') + (f.costly ? ' costly' : '') + (revealed && f.recommended ? ' recommended' : '');
      var badge = '';
      if (revealed && f.costly) badge = ' <span style="color: var(--warn); font-family: var(--mono); font-size: 10px;">·  ⚠ WEGLASSEN</span>';
      else if (revealed && f.recommended) badge = ' <span style="color: #7bc98a; font-family: var(--mono); font-size: 10px;">·  ✓ EMPFOHLEN</span>';
      var bucketTag = isAlways
        ? '<span style="color: var(--accent-soft);">always-on</span>'
        : '<span style="color: #7bc98a;">on-demand</span>';
      div.innerHTML =
        '<div class="doctor-fix-head">' +
          '<div class="doctor-fix-name">' + f.name + badge + '</div>' +
          '<div class="doctor-fix-check">' + (on ? '✓' : '') + '</div>' +
        '</div>' +
        '<div style="font-size: 12px; color: #c8c2b6; margin-bottom: 6px;">' + f.meta + '</div>' +
        '<div class="doctor-fix-meta">' +
          '<span class="qm-up">+ ' + f.score.toFixed(1) + ' Score</span>' +
          '<span' + (isAlways ? ' style="color: var(--accent-soft);"' : '') + '>+ ' + f.tokens + ' tok · ' + (isAlways ? '/Nachricht' : 'bei Trigger') + '</span>' +
          bucketTag +
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
    var always = BASE_ALWAYS;
    var body = 0;
    var activeCount = 0;
    FIXES.forEach(function (f) {
      if (state[f.id]) {
        score += f.score;
        if (f.bucket === 'always') always += f.tokens;
        else body += f.tokens;
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

    // Always-on meter — this is the one that hurts × N messages
    alwaysEl.textContent = '~' + always + ' tok';
    alwaysBar.style.width = Math.min(100, (always / 120) * 100) + '%';
    alwaysBar.parentNode.classList.remove('warn', 'bad');
    alwaysEl.classList.remove('ok', 'warn', 'bad');
    if (always > 80) { alwaysBar.parentNode.classList.add('bad'); alwaysEl.classList.add('bad'); }
    else if (always > ALWAYS_BUDGET) { alwaysBar.parentNode.classList.add('warn'); alwaysEl.classList.add('warn'); }
    else { alwaysEl.classList.add('ok'); }

    // Body meter (dark) — on-demand, paid only when fired
    bodyEl.textContent = body > 0 ? ('~' + body + ' tok') : 'inaktiv';
    bodyBar.style.width = Math.min(100, (body / 300) * 100) + '%';

    // Sweet spot
    activeCountEl.textContent = activeCount + ' von ' + FIXES.length + ' aktiv';
    var hasDesc = state.desc || state.cram; // the skill must be discoverable
    var inSweet = score >= 7 && always <= ALWAYS_BUDGET && state.desc && !state.cram;
    if (inSweet) {
      sweetEl.classList.add('hit');
      sweetEl.innerHTML = '✓ <span style="color: #fff;">Sweet-Spot!</span> Score ' + score.toFixed(1) +
        ' · Beschreibung nur ' + always + ' tok always-on · Body (' + body + ' tok) lädt erst beim Trigger';
    } else {
      sweetEl.classList.remove('hit');
      if (activeCount === 0) {
        sweetEl.innerHTML = '— Baue den Skill. Faustregel: <em>Beschreibung winzig (always-on), Body ausführlich (on-demand)</em>.';
      } else if (!hasDesc) {
        sweetEl.innerHTML = '⚠ Ohne <strong>Beschreibung</strong> lädt der Skill nie — der ganze Body bleibt totes Gewicht.';
      } else if (always > ALWAYS_BUDGET) {
        sweetEl.textContent = 'Beschreibung zu schwer (' + always + ' > ' + ALWAYS_BUDGET + ' tok always-on) — das zahlst du pro Nachricht.';
      } else if (score < 7) {
        sweetEl.textContent = 'Always-on schlank — aber Score noch zu niedrig (' + score.toFixed(1) + '). Fülle den Body.';
      } else {
        sweetEl.textContent = 'Score ' + score.toFixed(1) + ', always-on ' + always + ' tok — Sweet-Spot verfehlt.';
      }
    }

    // Char count (full SKILL.md)
    var fullText = baseName() + ' ' + FIXES.filter(function (f) { return state[f.id]; }).map(function (f) { return add(f); }).join(' ');
    var words = fullText.split(/\s+/).filter(Boolean).length;
    if (charcountEl) charcountEl.textContent = words + ' Wörter · ' + fullText.length + ' Zeichen';
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // The assembled SKILL.md as paste-ready plain text (frontmatter + body).
  function plainText() {
    var lines = ['---', baseName()];
    FIXES.forEach(function (f) { if (state[f.id] && f.bucket === 'always') lines.push(add(f)); });
    lines.push('---');
    var text = lines.join('\n');
    var body = FIXES.filter(function (f) { return state[f.id] && f.bucket === 'body'; })
      .map(function (f) { return add(f); });
    if (body.length) text += '\n\n' + body.join('\n\n');
    return text;
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
    revealed = !revealed;
    if (revealed) {
      FIXES.forEach(function (f) { state[f.id] = !!f.recommended; });
    }
    render();
  });

  section.addEventListener('rolechange', function (e) { role = e.detail.role; render(); });

  render();
})();
