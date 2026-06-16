/**
 * Exercise — Trust-Kalibrierung
 * Six real-world AI outputs. For each, the learner picks a strategy:
 *   0 = Vertrauen (trust / ship), 1 = Stichprobe (spot-check), 2 = Verifizieren (gate).
 * "Vergleich zeigen" reveals the expert choice + per-case reasoning and scores X/6.
 * Persona-aware (dev / nondev) via the shared role-switch 'rolechange' event:
 * only the SCENARIO WORDING changes — the correct strategy stays identical.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="Trust-Kalibrierung"]');
  if (!section) return;

  // strategy index → display
  var STRAT = [
    { key: 'trust',  label: 'Vertrauen',    cls: 'sel-trust'  },
    { key: 'spot',   label: 'Stichprobe',   cls: 'sel-spot'   },
    { key: 'verify', label: 'Verifizieren', cls: 'sel-verify' }
  ];

  // answer: index into STRAT. axes shown for context. why = expert reasoning.
  var CASES = [
    {
      tag: 'Niedriger Schaden · sofort sichtbar',
      text: 'Eine AI benennt Variablen in einer internen Hilfsfunktion um — die Tests laufen danach grün.',
      text_nd: 'Eine AI korrigiert Tippfehler in einer internen Team-Notiz.',
      answer: 0,
      why: 'Reversibel, billig, sofort sichtbar: Tests grün heißt, ein Fehler fällt automatisch auf. Hier zu prüfen kostet mehr als der mögliche Schaden — <strong>laufen lassen</strong>.',
      why_nd: 'Reversibel, billig, sofort sichtbar: ein Tippfehler-Fix in einer internen Notiz ist im Zweifel in Sekunden rückgängig gemacht. Kontrolle kostet hier mehr als der Schaden — <strong>laufen lassen</strong>.'
    },
    {
      tag: 'Niedriger Schaden · faktischer Drift möglich',
      text: 'Eine AI generiert den Changelog-Text für ein internes Release.',
      text_nd: 'Eine AI schreibt die Zusammenfassung eines Team-Meetings.',
      answer: 1,
      why: 'Schaden gering, aber das Modell kann Punkte erfinden oder weglassen — und das sieht man dem flüssigen Text nicht an. Kein Gate nötig, aber <strong>gelegentlich gegenlesen</strong>, sonst driftet die Qualität unbemerkt.',
      why_nd: 'Schaden gering, aber das Modell kann Punkte erfinden oder weglassen — und das sieht man der flüssigen Zusammenfassung nicht an. Kein Gate nötig, aber <strong>gelegentlich gegenlesen</strong>, sonst driftet die Qualität unbemerkt.'
    },
    {
      tag: 'Hoher Schaden · irreversibel',
      text: 'Eine AI führt eine SQL-Migration aus, die eine Spalte löscht — direkt auf der Produktions-Datenbank.',
      text_nd: 'Eine AI verschickt eine Massen-E-Mail an alle Kund:innen.',
      answer: 2,
      why: 'Hoher Schaden und kaum rückholbar: die gelöschte Spalte / die rausgegangene Mail bekommst du nicht zurück. Hier gilt <strong>Approval-Gate</strong> — ein Mensch prüft, bevor die Aktion wirkt. Kein Vertrauensvorschuss.',
      why_nd: 'Hoher Schaden und kaum rückholbar: eine rausgegangene Massen-Mail bekommst du nicht zurück. Hier gilt <strong>Approval-Gate</strong> — ein Mensch prüft, bevor die Aktion wirkt. Kein Vertrauensvorschuss.'
    },
    {
      tag: 'Mittlerer Schaden · Intention prüfbar',
      text: 'Eine AI schlägt 30 Unit-Tests für ein neues Modul vor.',
      text_nd: 'Eine AI erstellt 30 Quiz-Fragen für eine interne Schulung.',
      answer: 1,
      why: 'Klassische Falle: Tests können grün sein und trotzdem das Falsche prüfen (Quiz-Fragen klingen plausibel und sind doch ungenau). Nicht jeden einzeln verifizieren, aber <strong>eine Stichprobe auf Intention</strong> prüfen — fängt die „bestätigt nur sich selbst"-Fälle.',
      why_nd: 'Klassische Falle: die Fragen klingen plausibel und sind doch ungenau (bei Tests: grün, prüft aber das Falsche). Nicht jede einzeln verifizieren, aber <strong>eine Stichprobe auf Sinn</strong> prüfen — fängt die „klingt richtig"-Fälle.'
    },
    {
      tag: 'Hoher Schaden · extern sichtbar',
      text: 'Eine AI beantwortet Kundenanfragen im Support-Chat vollautomatisch — extern sichtbar.',
      text_nd: 'Eine AI antwortet Kund:innen direkt und ohne Freigabe im Support-Chat.',
      answer: 2,
      why: 'Extern sichtbar, Marken- und Rechtsrisiko, schwer einzufangen, sobald es raus ist. Auch wenn einzelne Antworten harmlos wirken: hier braucht es <strong>Verifikation</strong> (Freigabe oder mind. harte Output-Guardrails), bevor es zum Kunden geht.',
      why_nd: 'Extern sichtbar, Marken- und Rechtsrisiko, schwer einzufangen, sobald es raus ist. Auch wenn einzelne Antworten harmlos wirken: hier braucht es <strong>Verifikation</strong> (Freigabe oder harte Output-Guardrails), bevor es zum Kunden geht.'
    },
    {
      tag: 'Niedriger Schaden · vollständig prüfbar',
      text: 'Eine AI formatiert Code im Pre-Commit-Hook automatisch (Stil, Einrückung).',
      text_nd: 'Eine AI bringt eine Tabelle in ein einheitliches Format (Spalten, Datumsformat).',
      answer: 0,
      why: 'Deterministisch und vollständig automatisch prüfbar — das Ergebnis ist im Diff sichtbar und jederzeit zurücksetzbar. Genau der Fall, für den man <strong>vertraut</strong> und die gewonnene Zeit woanders einsetzt.',
      why_nd: 'Regelbasiert und vollständig prüfbar — die Änderung ist sichtbar und jederzeit zurücksetzbar. Genau der Fall, für den man <strong>vertraut</strong> und die gewonnene Zeit woanders einsetzt.'
    }
  ];

  var role = 'dev';
  function CT(c) { return (role === 'nondev' && c.text_nd) ? c.text_nd : c.text; }
  function CW(c) { return (role === 'nondev' && c.why_nd) ? c.why_nd : c.why; }

  // state: user[i] = null | 0 | 1 | 2
  var user = CASES.map(function () { return null; });
  var revealed = false;

  var listEl    = section.querySelector('#trust-list');
  var explainEl = section.querySelector('#trust-explain');
  var scoreEl   = section.querySelector('#trust-score');
  var scoreValEl= section.querySelector('#trust-score-val');
  var scoreBarEl= section.querySelector('#trust-score-bar');
  var revealBtn = section.querySelector('#trust-reveal');
  var resetBtn  = section.querySelector('#trust-reset');

  function render() {
    listEl.innerHTML = '';
    CASES.forEach(function (c, i) {
      var u = user[i];
      var item = document.createElement('div');
      var cls = 'trust-item';
      if (revealed) {
        cls += ' revealed ' + (u === c.answer ? 'match' : 'miss');
      }
      item.className = cls;

      // left: scenario text
      var left = document.createElement('div');
      left.innerHTML =
        '<div class="ti-tag">' + c.tag + '</div>' +
        '<div class="ti-text">' + CT(c) + '</div>';
      item.appendChild(left);

      // right: segmented control
      var seg = document.createElement('div');
      seg.className = 'trust-seg';
      STRAT.forEach(function (s, si) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = s.label;
        if (u === si) b.classList.add(s.cls);
        if (!revealed) {
          b.addEventListener('click', function (ev) {
            ev.stopPropagation();
            user[i] = (user[i] === si) ? null : si;
            render();
            showExplain(i);
          });
        } else {
          b.disabled = true;
          b.style.cursor = 'default';
          // keep both the user's pick and (if different) mark expert
          if (si === c.answer) { b.classList.add(STRAT[c.answer].cls); b.style.opacity = '1'; }
          else if (u === si) { b.style.opacity = '0.55'; }
          else { b.style.opacity = '0.4'; }
        }
        seg.appendChild(b);
      });
      item.appendChild(seg);

      // verdict line (revealed only)
      var verdict = document.createElement('div');
      verdict.className = 'ti-verdict';
      if (revealed) {
        var expertLabel = STRAT[c.answer].label;
        verdict.innerHTML = (u === c.answer)
          ? '✓ Match — Experten-Wahl: ' + expertLabel
          : '✗ Experten-Wahl: ' + expertLabel + (u !== null ? ' · deine Wahl: ' + STRAT[u].label : ' · du hast nichts gewählt');
      }
      item.appendChild(verdict);

      item.addEventListener('mouseenter', function () { showExplain(i); });
      listEl.appendChild(item);
    });
  }

  function showExplain(i) {
    var c = CASES[i];
    var u = user[i];
    var verdictText, verdictClass = '';
    if (revealed) {
      verdictText = 'Experten-Wahl: ' + STRAT[c.answer].label;
      verdictClass = (u === c.answer) ? '' : 'no';
    } else if (u !== null) {
      verdictText = 'Deine Wahl: ' + STRAT[u].label;
    } else {
      verdictText = 'Noch nicht entschieden';
      verdictClass = 'no';
    }
    explainEl.innerHTML =
      '<div class="matrix-explain-cell">' + c.tag + '</div>' +
      '<div class="matrix-explain-verdict' + (verdictClass ? ' no' : '') + '">' + verdictText + '</div>' +
      '<div class="matrix-explain-body">' + CW(c) + '</div>' +
      (revealed && u !== null && u !== c.answer
        ? '<div style="margin-top: 12px; padding: 8px 10px; background: rgba(168,48,32,0.18); border-radius: 6px; font-family: var(--mono); font-size: 11px; color: var(--accent-soft);">→ Deine Wahl wich von der Experten-Wahl ab.</div>'
        : ''
      );
  }

  function updateScore() {
    var match = 0;
    for (var i = 0; i < CASES.length; i++) { if (user[i] === CASES[i].answer) match++; }
    scoreValEl.textContent = match + ' / ' + CASES.length;
    scoreBarEl.style.width = (match / CASES.length * 100) + '%';
  }

  function reveal() {
    revealed = true;
    scoreEl.classList.add('show');
    revealBtn.textContent = 'Aufgedeckt';
    revealBtn.disabled = true;
    updateScore();
    render();
    explainEl.innerHTML =
      '<div class="matrix-explain-empty">Hover über einen Fall — die Begründung erscheint hier.</div>';
  }

  function reset() {
    user = CASES.map(function () { return null; });
    revealed = false;
    scoreEl.classList.remove('show');
    revealBtn.textContent = 'Vergleich zeigen';
    revealBtn.disabled = false;
    render();
    explainEl.innerHTML =
      '<div class="matrix-explain-empty">Wähle &amp; hover die Fälle — hier erscheint die Begründung des Experten.</div>';
  }

  revealBtn.addEventListener('click', reveal);
  resetBtn.addEventListener('click', reset);

  section.addEventListener('rolechange', function (ev) {
    role = ev.detail.role;
    // role-switch resets visible state; mirror that here
    user = CASES.map(function () { return null; });
    revealed = false;
    scoreEl.classList.remove('show');
    revealBtn.textContent = 'Vergleich zeigen';
    revealBtn.disabled = false;
    render();
    explainEl.innerHTML =
      '<div class="matrix-explain-empty">Wähle &amp; hover die Fälle — hier erscheint die Begründung des Experten.</div>';
  });

  render();
})();
