/**
 * Exercise 5 — Loop Simulator
 * Deterministic trajectory for "find bug in tokenStore.ts" task.
 * 4 guardrails, each with side-effects. Goal: terminate WITH commit, under budget.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="Loop-Simulator"]');
  if (!section) return;

  // Trajectory — the agent's deterministic plan
  var TRAJECTORY_DEV = [
    { verb: 'read', target: 'src/main.ts',           tokens: 1200, conf: 0.20, isEdit: false, finding: 'nichts konkret gefunden' },
    { verb: 'grep', target: '"validateToken"',       tokens: 1500, conf: 0.30, isEdit: false, finding: '14 Treffer in 7 Dateien' },
    { verb: 'read', target: 'src/auth.ts',           tokens: 2000, conf: 0.50, isEdit: false, finding: 'Token-Flow wird sichtbar' },
    { verb: 'read', target: 'src/tokenStore.ts',     tokens: 1800, conf: 0.65, isEdit: false, finding: 'Refresh-Logik bei Zeile 42 — verdächtig' },
    { verb: 'read', target: 'src/tokenStore.ts',     tokens: 1800, conf: 0.62, isEdit: false, finding: 'gleiche Datei nochmal — kein Mehrwert', repeat: true },
    { verb: 'grep', target: '"refresh"',             tokens: 1500, conf: 0.75, isEdit: false, finding: 'Race-Condition-Pattern erkannt' },
    { verb: 'think', target: 'Bug-Lokalisierung',    tokens: 800,  conf: 0.85, isEdit: false, finding: 'Bug bei tokenStore.ts:42 — fehlende Grace-Period' },
    { verb: 'edit', target: 'src/tokenStore.ts:42',  tokens: 2200, conf: 0.90, isEdit: true,  finding: 'Patch angewendet: Grace-Period-Guard hinzu' },
    { verb: 'read', target: 'src/tokenStore.ts',     tokens: 1800, conf: 0.88, isEdit: false, finding: 'Diff verifiziert — sieht korrekt aus' },
    // From here on: repeat-loop forever (sim continues to fabricate these)
    { verb: 'read', target: 'src/tokenStore.ts',     tokens: 1800, conf: 0.88, isEdit: false, finding: 'verify-Loop — gleicher Output', repeat: true },
    { verb: 'read', target: 'src/tokenStore.ts',     tokens: 1800, conf: 0.88, isEdit: false, finding: 'verify-Loop — gleicher Output', repeat: true },
    { verb: 'read', target: 'src/tokenStore.ts',     tokens: 1800, conf: 0.88, isEdit: false, finding: 'verify-Loop — gleicher Output', repeat: true }
  ];

  // ---- Non-Dev framing: Agent sucht den Fehler im Monatsreport ----
  var TRAJECTORY_NONDEV = [
    { verb: 'lesen',  target: 'Monatsreport.pdf',       tokens: 1200, conf: 0.20, isEdit: false, finding: 'nichts konkret gefunden' },
    { verb: 'suchen', target: '"Umsatz gesamt"',         tokens: 1500, conf: 0.30, isEdit: false, finding: '14 Treffer in 7 Dokumenten' },
    { verb: 'lesen',  target: 'Umsatztabelle.xlsx',      tokens: 2000, conf: 0.50, isEdit: false, finding: 'Zahlenfluss wird sichtbar' },
    { verb: 'lesen',  target: 'Buchungsjournal',         tokens: 1800, conf: 0.65, isEdit: false, finding: 'Sonderbuchung in Zeile 42 — verdächtig' },
    { verb: 'lesen',  target: 'Buchungsjournal',         tokens: 1800, conf: 0.62, isEdit: false, finding: 'gleiches Dokument nochmal — kein Mehrwert', repeat: true },
    { verb: 'suchen', target: '"Storno"',                tokens: 1500, conf: 0.75, isEdit: false, finding: 'doppelte Buchung erkannt' },
    { verb: 'denken', target: 'Fehler-Lokalisierung',    tokens: 800,  conf: 0.85, isEdit: false, finding: 'Fehler im Buchungsjournal Zeile 42 — fehlende Stornoregel' },
    { verb: 'ändern', target: 'Buchungsjournal Z.42',     tokens: 2200, conf: 0.90, isEdit: true,  finding: 'Korrektur angewendet: Stornoregel ergänzt' },
    { verb: 'lesen',  target: 'Buchungsjournal',         tokens: 1800, conf: 0.88, isEdit: false, finding: 'Korrektur geprüft — sieht korrekt aus' },
    { verb: 'lesen',  target: 'Buchungsjournal',         tokens: 1800, conf: 0.88, isEdit: false, finding: 'Prüf-Schleife — gleiches Ergebnis', repeat: true },
    { verb: 'lesen',  target: 'Buchungsjournal',         tokens: 1800, conf: 0.88, isEdit: false, finding: 'Prüf-Schleife — gleiches Ergebnis', repeat: true },
    { verb: 'lesen',  target: 'Buchungsjournal',         tokens: 1800, conf: 0.88, isEdit: false, finding: 'Prüf-Schleife — gleiches Ergebnis', repeat: true }
  ];

  var role = 'dev';
  var TRAJECTORY = TRAJECTORY_DEV;

  // ---- Guardrail config ----
  var guards = {
    maxIter:    { on: false, value: 10, min: 1, max: 20, step: 1, label: 'Max-Iterationen',     unit: '',     warn: 'Zu klein? Loop stoppt vor dem Fix.' },
    sameAction: { on: false,                                       label: 'Same-Action-Detect',   unit: '',     warn: 'Verhindert Verify-Loops · blockiert aber legitime Retries.' },
    budget:     { on: false, value: 20000, min: 2000, max: 50000, step: 1000, label: 'Token-Budget', unit: ' tok', warn: 'Zu eng → Abbruch vor Edit. Zu groß → kein echter Schutz.' },
    conf:       { on: false, value: 0.85, min: 0.50, max: 0.99, step: 0.01, label: 'Confidence-Schwelle (zum Commit)', unit: '', warn: 'Zu hoch → commited nie. Zu niedrig → voreilige Commits.' }
  };

  // ---- Elements ----
  var guardsEl = section.querySelector('#loop-guards');
  var itersEl = section.querySelector('#loop-iters');
  var iterCountEl = section.querySelector('#loop-iter-count');
  var tokenCountEl = section.querySelector('#loop-token-count');
  var confEl = section.querySelector('#loop-conf');
  var statusEl = section.querySelector('#loop-status');
  var emptyEl = section.querySelector('#loop-empty');
  var startBtn = section.querySelector('#loop-start');
  var resetBtn = section.querySelector('#loop-reset');
  var activeCountEl = section.querySelector('#loop-active-count');

  // ---- Sim state ----
  var sim = null;

  function freshSim() {
    return {
      iters: [],
      position: 0,
      iterCount: 0,
      tokens: 0,
      conf: 0,
      hasEdited: false,
      lastAction: null,
      runLen: 0,
      loopRowEl: null,
      loopReps: 0,
      loopTokens: 0,
      terminated: false,
      reason: null,
      timer: null
    };
  }

  // ---- Render guardrails ----
  function renderGuards() {
    guardsEl.innerHTML = '';
    Object.keys(guards).forEach(function (key) {
      var g = guards[key];
      var div = document.createElement('div');
      div.className = 'loop-guard' + (g.on ? ' on' : '');

      var head = document.createElement('div');
      head.className = 'loop-guard-head';
      head.innerHTML =
        '<div class="loop-guard-name">' + g.label + '</div>' +
        '<div class="loop-guard-toggle"></div>';
      div.appendChild(head);

      if (g.value !== undefined) {
        var detail = document.createElement('div');
        detail.className = 'loop-guard-detail';
        var displayVal = g.unit === ' tok' ? (g.value / 1000).toFixed(0) + 'k' : (key === 'conf' ? g.value.toFixed(2) : g.value);
        detail.innerHTML =
          '<input type="range" min="' + g.min + '" max="' + g.max + '" step="' + g.step + '" value="' + g.value + '"' + (g.on ? '' : ' disabled') + '/>' +
          '<span class="lg-val">' + displayVal + (g.unit && g.unit !== ' tok' ? g.unit : '') + '</span>';
        div.appendChild(detail);

        detail.querySelector('input').addEventListener('input', function (e) {
          e.target.classList.add('touched');
          g.value = parseFloat(e.target.value);
          var disp = g.unit === ' tok' ? (g.value / 1000).toFixed(0) + 'k' : (key === 'conf' ? g.value.toFixed(2) : g.value);
          detail.querySelector('.lg-val').textContent = disp;
        });
      }

      var warn = document.createElement('div');
      warn.className = 'loop-guard-warn';
      warn.textContent = '↳ ' + g.warn;
      div.appendChild(warn);

      head.querySelector('.loop-guard-toggle').addEventListener('click', function (e) {
        e.stopPropagation();
        g.on = !g.on;
        renderGuards();
        updateActiveCount();
      });
      head.querySelector('.loop-guard-name').addEventListener('click', function () {
        g.on = !g.on;
        renderGuards();
        updateActiveCount();
      });

      guardsEl.appendChild(div);
    });
  }

  function updateActiveCount() {
    var n = Object.values(guards).filter(function (g) { return g.on; }).length;
    activeCountEl.textContent = n + ' / 4 aktiv';
  }

  // ---- Run simulation ----
  function start() {
    if (sim && !sim.terminated) return; // already running
    sim = freshSim();
    itersEl.innerHTML = '';
    emptyEl.style.display = 'none';
    statusEl.textContent = 'läuft';
    statusEl.className = 'lsc-val warn';
    startBtn.disabled = true;
    startBtn.textContent = '… läuft';

    sim.timer = setInterval(step, 450);
  }

  function step() {
    if (sim.terminated) {
      clearInterval(sim.timer);
      return;
    }
    var idx = sim.position;
    if (idx >= TRAJECTORY.length) {
      // synth more repeat verify
      idx = TRAJECTORY.length - 1;
    }
    var current = TRAJECTORY[idx];

    // same-action-detect: if previous was same verb+target, terminate
    if (guards.sameAction.on && sim.lastAction &&
        sim.lastAction.verb === current.verb && sim.lastAction.target === current.target) {
      terminate('same-action', 'Same-Action-Detect: identische Aktion zum letzten Mal — kein neuer Erkenntnisgewinn. Exit.');
      return;
    }

    // run iteration
    var prevConf = sim.conf;
    // run-length of consecutive identical actions (same verb+target)
    var sameAsPrev = sim.lastAction &&
      sim.lastAction.verb === current.verb && sim.lastAction.target === current.target;
    sim.runLen = sameAsPrev ? sim.runLen + 1 : 1;

    sim.iterCount++;
    sim.tokens += current.tokens;
    sim.conf = current.conf;
    sim.lastAction = current;
    if (current.isEdit) sim.hasEdited = true;
    sim.position = idx + 1;

    // 3+ identical actions in a row = a stuck loop → collapse into ONE live row
    // instead of printing the same line over and over.
    if (sim.runLen >= 3) {
      updateLoopRow(current);
    } else {
      sim.loopRowEl = null;
      appendIter(sim.iterCount, current, prevConf);
    }
    updateStatusCards();

    // post-iter checks
    // 1. confidence threshold met AND we have an edit → commit
    if (guards.conf.on && sim.hasEdited && current.conf >= guards.conf.value) {
      terminate('commit', 'Confidence ' + current.conf.toFixed(2) + ' ≥ Schwelle ' + guards.conf.value.toFixed(2) + ' und Edit erfolgt → Commit.');
      return;
    }
    // 2. max-iter
    if (guards.maxIter.on && sim.iterCount >= guards.maxIter.value) {
      terminate('max-iter', 'Max-Iter ' + guards.maxIter.value + ' erreicht. Abbruch.');
      return;
    }
    // 3. budget
    if (guards.budget.on && sim.tokens >= guards.budget.value) {
      terminate('budget', 'Token-Budget ' + (guards.budget.value / 1000).toFixed(0) + 'k verbraucht. Abbruch.');
      return;
    }
    // 4. hard cap (no guardrails)
    if (sim.iterCount >= 20) {
      terminate('hard-stop', 'Hart-Limit 20 Iterationen — DU BRAUCHST GUARDRAILS.');
      return;
    }
  }

  function appendIter(n, action, prevConf) {
    var row = document.createElement('div');
    row.className = 'loop-iter' + (action.repeat ? ' repeat' : '');
    var nStr = 'i' + (n < 10 ? '0' : '') + n;
    // confidence delta vs. previous step — makes stagnation visible
    var delta = action.conf - (prevConf || 0);
    var deltaStr, deltaClass;
    if (delta >= 0.005) { deltaStr = '+' + delta.toFixed(2); deltaClass = 'up'; }
    else if (delta <= -0.005) { deltaStr = delta.toFixed(2); deltaClass = 'down'; }
    else { deltaStr = '±0.00'; deltaClass = 'flat'; }
    row.innerHTML =
      '<span class="li-n">' + nStr + '</span>' +
      '<span class="li-act"><span class="li-verb">' + action.verb + '</span> ' + action.target + ' — <em style="color: var(--ink-3); font-style: normal;">' + action.finding + '</em></span>' +
      '<span class="li-conf">conf ' + action.conf.toFixed(2) + '<span class="li-delta ' + deltaClass + '">' + deltaStr + '</span></span>' +
      '<span class="li-tok">' + (action.tokens / 1000).toFixed(1) + 'k</span>';
    itersEl.appendChild(row);
    itersEl.scrollTop = itersEl.scrollHeight;
  }

  // Collapse a stuck verify-loop into a single live-updating row:
  // a repeat counter climbs and tokens keep burning, while confidence stays frozen.
  function updateLoopRow(action) {
    if (!sim.loopRowEl) {
      var row = document.createElement('div');
      row.className = 'loop-stuck';
      row.innerHTML =
        '<div class="ls-spin">\u21BB</div>' +
        '<div class="ls-body">' +
          '<div class="ls-title">Stuck-Loop &middot; <span class="ls-x">\u00D7<span class="ls-x-n">2</span></span></div>' +
          '<div class="ls-sub">Immer wieder <em>' + action.verb + ' ' + action.target + '</em> &mdash; gleiche Aktion, <strong>kein neuer Erkenntnisgewinn</strong>. Ohne Stopp-Kriterium dreht der Agent endlos.</div>' +
        '</div>' +
        '<div class="ls-stats">' +
          '<div class="ls-stat"><span class="ls-stat-l">Confidence</span><span class="ls-stat-v frozen">' + action.conf.toFixed(2) + ' \u2744 eingefroren</span></div>' +
          '<div class="ls-stat"><span class="ls-stat-l">verschwendet</span><span class="ls-stat-v waste">+<span class="ls-waste">0.0</span>k tok</span></div>' +
        '</div>';
      itersEl.appendChild(row);
      sim.loopRowEl = row;
      sim.loopReps = 2; // i_n-1 + i_n were the first two identical actions before collapse kicked in
      sim.loopTokens = 0;
    }
    sim.loopReps += 1;
    sim.loopTokens += action.tokens;
    sim.loopRowEl.querySelector('.ls-x-n').textContent = sim.loopReps;
    sim.loopRowEl.querySelector('.ls-waste').textContent = (sim.loopTokens / 1000).toFixed(1);
    itersEl.scrollTop = itersEl.scrollHeight;
  }

  function terminate(reason, message) {
    sim.terminated = true;
    sim.reason = reason;
    clearInterval(sim.timer);

    // the loop has stopped churning — freeze the stuck-loop spinner
    if (sim.loopRowEl) sim.loopRowEl.classList.add('frozen');

    var success = (reason === 'commit' && sim.hasEdited);
    var partial = (reason === 'same-action' && sim.hasEdited);

    var row = document.createElement('div');
    row.className = 'loop-iter ' + (success || partial ? 'terminate' : 'cutoff');
    row.innerHTML =
      '<span class="li-n">END</span>' +
      '<span class="li-act"><span class="li-verb">' + (success ? '✓ commit' : partial ? '◐ exit' : '✗ abort') + '</span> — ' + message + '</span>' +
      '<span class="li-conf">' + sim.conf.toFixed(2) + '</span>' +
      '<span class="li-tok">Σ ' + (sim.tokens / 1000).toFixed(1) + 'k</span>';
    itersEl.appendChild(row);
    itersEl.scrollTop = itersEl.scrollHeight;

    statusEl.textContent = success ? '✓ success' : partial ? '◐ partial' : '✗ fail';
    statusEl.className = 'lsc-val ' + (success ? 'ok' : partial ? 'warn' : 'bad');

    startBtn.disabled = false;
    startBtn.textContent = '▶ Start';

    // optional verdict
    var verdict = document.createElement('div');
    verdict.style.cssText = 'margin-top: 8px; padding: 12px 14px; border-radius: 8px; font-family: var(--mono); font-size: 12px; line-height: 1.5;';
    if (success) {
      verdict.style.background = 'rgba(61,138,74,0.18)';
      verdict.style.color = 'var(--ok)';
      verdict.innerHTML = '✓ <strong>Saubere Terminierung mit Fix.</strong> ' + sim.iterCount + ' Iterationen, ' + (sim.tokens / 1000).toFixed(1) + 'k Tokens. Du hast die Pareto-Front gefunden.';
    } else if (partial) {
      verdict.style.background = 'rgba(184,132,31,0.16)';
      verdict.style.color = 'var(--warn)';
      verdict.innerHTML = '◐ <strong>Fix erfolgt, aber durch Same-Action-Detect gestoppt</strong>. Kein expliziter Commit — Confidence-Schwelle hätte sauberer terminiert.';
    } else if (reason === 'commit') {
      verdict.style.background = 'rgba(168,48,32,0.18)';
      verdict.style.color = 'var(--bad)';
      verdict.innerHTML = '✗ <strong>Commit ohne Edit?</strong> Confidence reichte vor dem Fix — voreilig.';
    } else {
      verdict.style.background = 'rgba(168,48,32,0.18)';
      verdict.style.color = 'var(--bad)';
      verdict.innerHTML = '✗ <strong>Abbruch vor Fix.</strong> ' + sim.iterCount + ' Iterationen, ' + (sim.tokens / 1000).toFixed(1) + 'k Tokens — und kein Resultat. Guardrails neu justieren.';
    }
    itersEl.appendChild(verdict);
    itersEl.scrollTop = itersEl.scrollHeight;
  }

  function updateStatusCards() {
    iterCountEl.textContent = sim.iterCount;
    tokenCountEl.textContent = (sim.tokens / 1000).toFixed(1) + 'k';
    confEl.textContent = sim.conf.toFixed(2);
  }

  function reset() {
    if (sim && sim.timer) clearInterval(sim.timer);
    sim = null;
    itersEl.innerHTML = '<div class="loop-empty" id="loop-empty">Drücke „Start" — ohne Guardrails dreht\'s bis zum Token-Crash.</div>';
    iterCountEl.textContent = '0';
    tokenCountEl.textContent = '0';
    confEl.textContent = '—';
    statusEl.textContent = 'idle';
    statusEl.className = 'lsc-val';
    startBtn.disabled = false;
    startBtn.textContent = '▶ Start';
  }

  startBtn.addEventListener('click', start);
  resetBtn.addEventListener('click', reset);

  section.addEventListener('rolechange', function (e) {
    role = e.detail.role;
    TRAJECTORY = (role === 'nondev') ? TRAJECTORY_NONDEV : TRAJECTORY_DEV;
    reset();
  });

  renderGuards();
  updateActiveCount();
})();
