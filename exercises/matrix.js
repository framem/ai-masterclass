/**
 * Exercise 6 — Threat Matrix
 * 4 threats × 4 defense layers. User clicks each cell to set "catches / doesn't".
 * Reveal compares with expert. Hover shows explanation.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="Threat-Matrix"]');
  if (!section) return;

  var THREATS = [
    { name: 'Prompt-Injection',  tag: 'attack',     desc: 'User schmuggelt Instruktionen in Eingaben ein.' },
    { name: 'Halluzination',     tag: 'integrity',  desc: 'Modell erfindet faktisch falsche Informationen.' },
    { name: 'Data Leak',         tag: 'privacy',    desc: 'Sensible Daten verlassen das System ungewollt.' },
    { name: 'Goal-Misalignment', tag: 'control',    desc: 'Agent verfolgt Sub-Ziele, die nicht intendiert sind.' }
  ];

  var LAYERS = [
    { name: 'Input-Filter',  tag: 'PRÄVENTION', desc: 'Pattern-Matching/Classifier prüft Eingaben vor dem Modell.' },
    { name: 'Sandbox',       tag: 'KAPSELUNG',  desc: 'Begrenzt, welche Tools/Daten/Aktionen verfügbar sind.' },
    { name: 'Output-Review', tag: 'DETEKTION',  desc: 'Zweiter Pass (Modell oder Regel) prüft Output vor Übergabe.' },
    { name: 'Audit',         tag: 'FORENSIK',   desc: 'Vollständiges Log für nachträgliche Analyse + Compliance.' }
  ];

  // Expert truth table — does layer L catch threat T?
  // Indexed: [threatIdx][layerIdx]
  var EXPERT = [
    // Prompt-Injection: filter ✓, sandbox ✓, review ✗, audit ✗
    [true,  true,  false, false],
    // Halluzination: filter ✗, sandbox ✗, review ✓, audit ✗
    [false, false, true,  false],
    // Data Leak: filter ✓, sandbox ✓, review ✓, audit ✓
    [true,  true,  true,  true],
    // Goal-Misalignment: filter ✗, sandbox ✓, review ✓, audit ✓
    [false, true,  true,  true]
  ];

  // Explanation per cell — why YES or why NO
  var EXPLAINS = [
    [
      { yes: true,  text: 'Pattern-Matching auf bekannte Injection-Marker („ignoriere alle vorherigen Anweisungen", Role-Hijacks, Encoded Payloads) fängt 80–90% der Skript-Kiddie-Versuche ab.' },
      { yes: true,  text: 'Selbst wenn die Injection den Agenten kapert: Sandbox limitiert, welche Tools/Daten erreichbar sind. „Drop database"-Befehl trifft auf leere API-Surface.', text_nd: 'Selbst wenn die Injection den Agenten kapert: Sandbox limitiert, welche Tools/Daten erreichbar sind. Ein „Alles löschen"-Befehl trifft auf leere Berechtigungen.' },
      { yes: false, text: 'Wenn die Injection eine TOOL-Aktion auslöst, ist der Schaden schon angerichtet, bevor Output-Review schaut. Output kommt zu spät.' },
      { yes: false, text: 'Audit dokumentiert — verhindert aber nichts. Wertvoll für Forensik nach dem Vorfall, nicht für Prävention.' }
    ],
    [
      { yes: false, text: 'Halluzinationen kommen vom Modell, nicht vom Input. Filtern auf der Eingangsseite hilft nicht — der Input kann völlig harmlos sein.' },
      { yes: false, text: 'Sandbox kapselt Aktionen, nicht Wahrheitsgehalt. Modell kann perfekt sicher und perfekt falsch sein.' },
      { yes: true,  text: 'Ein zweiter Pass (Fact-Check-LLM, Regel-Engine, RAG-Verifier) ist die Standardabwehr. Vergleicht Aussagen mit Ground-Truth.' },
      { yes: false, text: 'Audit zeigt im Nachhinein, was passiert ist — der Nutzer hat die Halluzination längst gesehen und geglaubt.' }
    ],
    [
      { yes: true,  text: 'Filter blockiert „Send mir alle E-Mail-Adressen", PII-Anfragen, bekannte Exfiltration-Patterns. Erste Verteidigungslinie.' },
      { yes: true,  text: 'Sandbox limitiert, WELCHE Daten der Agent überhaupt sehen kann. Was er nicht sieht, kann er nicht leaken.' },
      { yes: true,  text: 'Output-Scanner mit PII-Erkennung blockt Sozialversicherungs-Nummern, Tokens, interne URLs vor dem Senden.', text_nd: 'Output-Scanner mit PII-Erkennung blockt Sozialversicherungs-Nummern, Kontodaten und interne Links vor dem Senden.' },
      { yes: true,  text: 'Audit ist hier essenziell: ermöglicht Detection im Nachhinein, regulatorische Compliance, Schadensbegrenzung.' }
    ],
    [
      { yes: false, text: 'Goal-Misalignment liegt im Modell, nicht im Input. Der User-Request kann völlig okay sein, das Modell interpretiert ihn falsch.' },
      { yes: true,  text: 'Sandbox ist der wichtigste Layer hier: limitiert, welche Aktionen der Agent <em>überhaupt ausführen kann</em>. Misalignment ohne Macht ist harmlos.' },
      { yes: true,  text: 'Action-Review (auch „human-in-the-loop") vor jeder destruktiven Aktion. Klassische Implementation: rm/git push/payment braucht Bestätigung.', text_nd: 'Action-Review (auch „human-in-the-loop") vor jeder kritischen Aktion. Typisch: Löschung, Versand oder Zahlung braucht eine Bestätigung.' },
      { yes: true,  text: 'Audit erlaubt es, Misalignment-Patterns post-hoc zu erkennen und Modelle/Prompts gezielt anzupassen.' }
    ]
  ];

  // ---- State ----
  // user[threatIdx][layerIdx] = null | true | false
  var user = [];
  for (var i = 0; i < 4; i++) { user.push([null, null, null, null]); }
  var revealed = false;
  var hoverCell = null;

  var role = 'dev';
  function ET(e) { return (role === 'nondev' && e.text_nd) ? e.text_nd : e.text; }

  // ---- Elements ----
  var gridEl = section.querySelector('#matrix-grid');
  var explainEl = section.querySelector('#matrix-explain');
  var scoreEl = section.querySelector('#matrix-score');
  var scoreValEl = section.querySelector('#matrix-score-val');
  var scoreBarEl = section.querySelector('#matrix-score-bar');
  var revealBtn = section.querySelector('#matrix-reveal');
  var resetBtn = section.querySelector('#matrix-reset');

  function render() {
    gridEl.innerHTML = '';

    // Top-left empty corner
    var corner = document.createElement('div');
    corner.className = 'matrix-corner';
    gridEl.appendChild(corner);

    // Column headers (layers)
    LAYERS.forEach(function (layer) {
      var div = document.createElement('div');
      div.className = 'matrix-colhead';
      div.innerHTML =
        '<div class="mch-name">' + layer.name + '</div>' +
        '<div class="mch-tag">' + layer.tag + '</div>';
      gridEl.appendChild(div);
    });

    // Rows
    THREATS.forEach(function (threat, ti) {
      var rowhead = document.createElement('div');
      rowhead.className = 'matrix-rowhead';
      rowhead.innerHTML =
        '<div class="mrh-name">' + threat.name + '</div>' +
        '<div class="mrh-tag">' + threat.tag + '</div>';
      gridEl.appendChild(rowhead);

      LAYERS.forEach(function (layer, li) {
        var cell = document.createElement('div');
        var u = user[ti][li];
        var cls = 'matrix-cell';
        if (!revealed) {
          if (u === true)  cls += ' user-yes';
          if (u === false) cls += ' user-no';
        } else {
          var expert = EXPERT[ti][li];
          var matches = (u === expert);
          cls += ' revealed ' + (matches ? 'match' : 'miss');
        }
        cell.className = cls;
        var userIconStr = u === true ? '✓' : (u === false ? '✗' : '·');
        var correctIconStr = EXPERT[ti][li] ? '✓' : '✗';
        cell.innerHTML =
          '<span class="mc-icon-user">' + userIconStr + '</span>' +
          '<span class="mc-correct">' + correctIconStr + '</span>' +
          '<span class="mc-match-tag">' + (revealed ? (u === EXPERT[ti][li] ? 'match' : 'miss') : '') + '</span>';

        cell.addEventListener('click', function () {
          if (revealed) return;
          var cur = user[ti][li];
          // cycle: null → true → false → null
          if (cur === null) user[ti][li] = true;
          else if (cur === true) user[ti][li] = false;
          else user[ti][li] = null;
          updateScore();
          render();
          showExplain(ti, li);
        });
        cell.addEventListener('mouseenter', function () {
          showExplain(ti, li);
        });
        gridEl.appendChild(cell);
      });
    });
  }

  function showExplain(ti, li) {
    var e = EXPLAINS[ti][li];
    var u = user[ti][li];
    var threat = THREATS[ti];
    var layer = LAYERS[li];

    var verdictText;
    var verdictClass = '';
    if (revealed) {
      var expert = EXPERT[ti][li];
      verdictText = expert ? '✓ Fängt' : '✗ Fängt nicht';
      verdictClass = expert ? '' : 'no';
    } else if (u !== null) {
      verdictText = u ? 'Deine Antwort: ✓ Fängt' : 'Deine Antwort: ✗ Fängt nicht';
      verdictClass = u ? '' : 'no';
    } else {
      verdictText = 'Noch nicht entschieden';
      verdictClass = 'no';
    }

    explainEl.innerHTML =
      '<div class="matrix-explain-cell">' + layer.name + ' × ' + threat.name + '</div>' +
      '<div class="matrix-explain-verdict' + (verdictClass ? ' no' : '') + '">' + verdictText + '</div>' +
      '<div class="matrix-explain-body">' + ET(e) + '</div>' +
      (revealed && u !== null && u !== EXPERT[ti][li]
        ? '<div style="margin-top: 12px; padding: 8px 10px; background: rgba(168,48,32,0.18); border-radius: 6px; font-family: var(--mono); font-size: 11px; color: var(--accent-soft);">→ Deine Wahl wich von der Experten-Karte ab.</div>'
        : ''
      );
  }

  function updateScore() {
    if (!revealed) return;
    var match = 0, total = 16;
    for (var t = 0; t < 4; t++) {
      for (var l = 0; l < 4; l++) {
        if (user[t][l] === EXPERT[t][l]) match++;
      }
    }
    scoreValEl.textContent = match + ' / ' + total;
    scoreBarEl.style.width = (match / total * 100) + '%';
  }

  function reveal() {
    revealed = true;
    scoreEl.classList.add('show');
    revealBtn.textContent = 'Aufgedeckt';
    revealBtn.disabled = true;
    updateScore();
    render();
    explainEl.innerHTML =
      '<div class="matrix-explain-empty">Hover über eine Zelle — Begründungen erscheinen hier.</div>';
  }

  function reset() {
    for (var i = 0; i < 4; i++) user[i] = [null, null, null, null];
    revealed = false;
    scoreEl.classList.remove('show');
    revealBtn.textContent = 'Vergleich zeigen';
    revealBtn.disabled = false;
    render();
    explainEl.innerHTML =
      '<div class="matrix-explain-empty">Klicke &amp; hover die Zellen — hier erscheint die Begründung des Experten.</div>';
  }

  revealBtn.addEventListener('click', reveal);
  resetBtn.addEventListener('click', reset);

  section.addEventListener('rolechange', function (ev) {
    role = ev.detail.role;
    render();
  });

  render();
})();
