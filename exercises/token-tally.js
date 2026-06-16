/**
 * Token-Tally — concept slide between Casino and System-Prompt-Doctor.
 *
 * Shows WHAT a system prompt and a user prompt are, and demonstrates that a
 * stateless model is re-sent the system prompt + the entire transcript on
 * every turn — so the per-call input tokens (and the cumulative bill) grow.
 *
 * No persistence, no scoring. "Antwort senden" reveals the next turn (the
 * user message + the model's reply) and counts one API call.
 */
(function () {
  'use strict';

  var SYSTEM = {
    tok: 86,
    text: 'Du bist der Support-Assistent von Helio. Antworte knapp, auf Deutsch, im Sie-Format. Eskaliere Zahlungsthemen an einen Menschen.'
  };

  // Each entry = one turn: a user message + the model's reply.
  var TURNS = [
    {
      u: { tok: 21, text: 'Meine Rechnung wurde diesen Monat doppelt abgebucht.' },
      a: { tok: 68, text: 'Das tut mir leid. Ich sehe zwei Buchungen vom 3. Mai. Ich leite das an unser Zahlungsteam weiter — Sie erhalten eine Gutschrift.' }
    },
    {
      u: { tok: 14, text: 'Wie lange dauert die Rückerstattung?' },
      a: { tok: 32, text: 'Die Gutschrift erscheint in 3–5 Werktagen auf Ihrer Karte.' }
    },
    {
      u: { tok: 19, text: 'Kann ich solange die nächste Zahlung pausieren?' },
      a: { tok: 41, text: 'Ja — ich pausiere Ihre nächste Abbuchung. Soll ich eine Bestätigung per E-Mail senden?' }
    },
    {
      u: { tok: 7, text: 'Ja, bitte.' },
      a: { tok: 28, text: 'Erledigt. Die Bestätigung ist unterwegs. Kann ich sonst noch helfen?' }
    }
  ];

  function init() {
    var stage = document.getElementById('ex-tally');
    var section = stage && stage.closest('section');
    if (!section) return;

    var streamEl   = section.querySelector('#tally-stream');
    var resentEl   = section.querySelector('#tally-chat-resent');
    var callNoEl   = section.querySelector('#tally-callno');
    var stackEl    = section.querySelector('#tally-stack');
    var callTokEl  = section.querySelector('#tally-call-tok');
    var callSubEl  = section.querySelector('#tally-call-sub');
    var totalTokEl = section.querySelector('#tally-total-tok');
    var totalSubEl = section.querySelector('#tally-total-sub');
    var histEl     = section.querySelector('#tally-hist');
    var histNoteEl = section.querySelector('#tally-hist-note');
    var insightEl  = section.querySelector('#tally-insight');
    var nextBtn    = section.querySelector('#tally-next');
    var resetBtn   = section.querySelector('#tally-reset');
    var nextTextEl = section.querySelector('#tally-next-text');
    var compLabelEl= section.querySelector('#tally-comp-label');
    var compCostEl = section.querySelector('#tally-comp-cost');
    var composerEl = section.querySelector('#tally-composer');
    var totalHeroEl= section.querySelector('#tally-total-hero');
    var deltaEl    = section.querySelector('#tally-total-delta');

    var revealed = 0; // completed turns / API calls so far

    // Input-token breakdown for 1-indexed call t.
    function breakdown(t) {
      var hist = 0;
      for (var i = 0; i < t - 1; i++) hist += TURNS[i].u.tok + TURNS[i].a.tok;
      var nu = TURNS[t - 1].u.tok;
      return { sys: SYSTEM.tok, hist: hist, nu: nu, total: SYSTEM.tok + hist + nu };
    }

    function fmt(n) { return n.toLocaleString('de-DE') + ' tok'; }

    // How many API calls so far have carried this message as input.
    // Every call re-sends the whole transcript, so each older message has
    // been mitgeschickt one more time than the message after it.
    function resentBadge(count) {
      if (count < 1) return '';
      return '<span class="tally-resent">↻ ' + count + '× mitgeschickt</span>';
    }

    // composer sits in the chat: it shows the next message you'll send and
    // how many input-tokens that one send will cost (whole transcript + new).
    function updateComposer() {
      if (revealed < TURNS.length) {
        composerEl.classList.remove('done');
        nextTextEl.textContent = TURNS[revealed].u.text;
        var nextCall = breakdown(revealed + 1);
        compLabelEl.textContent = revealed === 0 ? 'Deine erste Nachricht' : 'Deine nächste Nachricht';
        compCostEl.textContent = 'sendet ' + fmt(nextCall.total) + ' Input →';
        nextBtn.disabled = false;
        nextBtn.textContent = 'Antwort senden →';
      } else {
        composerEl.classList.add('done');
        nextTextEl.textContent = 'Gespräch zu Ende — alle vier Turns gesendet.';
        compLabelEl.textContent = 'Keine weitere Nachricht';
        compCostEl.textContent = '';
        nextBtn.disabled = true;
        nextBtn.textContent = 'Gespräch zu Ende';
      }
    }

    function render() {
      updateComposer();

      // ---- left: transcript ----
      var html = '';
      html += '<div class="tally-msg system">' +
        '<div class="tally-msg-head">' +
          '<span class="tally-tag">System</span>' +
          resentBadge(revealed) +
          '<span class="tally-tok">' + SYSTEM.tok + ' tok</span>' +
        '</div>' +
        '<div class="tally-body">' + SYSTEM.text + '</div>' +
      '</div>';

      for (var i = 0; i < revealed; i++) {
        var fresh = (i === revealed - 1) ? ' fresh' : '';
        // User msg of turn i+1 is sent on calls (i+1)..revealed -> (revealed - i) times.
        // Assistant reply of turn i+1 is output of call i+1, then re-sent on the
        // following calls -> (revealed - i - 1) times (0 for the newest reply).
        var userResent = revealed - i;
        var asstResent = revealed - i - 1;
        html += '<div class="tally-msg user' + fresh + '">' +
          '<div class="tally-msg-head"><span class="tally-tag">User</span>' +
          resentBadge(userResent) +
          '<span class="tally-tok">' + TURNS[i].u.tok + ' tok</span></div>' +
          '<div class="tally-body">' + TURNS[i].u.text + '</div></div>';
        html += '<div class="tally-msg assistant' + fresh + '">' +
          '<div class="tally-msg-head"><span class="tally-tag">Assistant</span>' +
          resentBadge(asstResent) +
          '<span class="tally-tok">' + TURNS[i].a.tok + ' tok</span></div>' +
          '<div class="tally-body">' + TURNS[i].a.text + '</div></div>';
      }

      if (revealed === 0) {
        html += '<div class="tally-empty">Nur das System-Prompt ist gesetzt. Klicke „Antwort senden", um den ersten Turn zu schicken.</div>';
      }
      streamEl.innerHTML = html;
      streamEl.scrollTop = streamEl.scrollHeight;

      resentEl.textContent = revealed > 0 ? ('Ganzer Verlauf bei jedem Aufruf erneut gesendet') : '';

      // ---- right: bill ----
      if (revealed === 0) {
        callNoEl.innerHTML = 'Noch kein Aufruf';
        stackEl.innerHTML = '';
        callTokEl.textContent = '0 tok';
        callSubEl.innerHTML = '&nbsp;';
        totalTokEl.textContent = '0 tok';
        totalSubEl.textContent = 'noch kein Aufruf gesendet';
        insightEl.innerHTML = 'Das <strong>System-Prompt</strong> definiert Rolle &amp; Verhalten — einmal geschrieben. Das <strong>User-Prompt</strong> ist die Aufgabe <em>diesmal</em>. Sende den ersten Turn.';
        renderHist();
        return;
      }

      var b = breakdown(revealed);
      callNoEl.innerHTML = 'Aufruf <span>Nr. ' + revealed + '</span>';

      stackEl.innerHTML =
        '<div class="tally-seg sys"  style="flex-basis:' + (b.sys / b.total * 100) + '%"></div>' +
        '<div class="tally-seg hist" style="flex-basis:' + (b.hist / b.total * 100) + '%"></div>' +
        '<div class="tally-seg new"  style="flex-basis:' + (b.nu / b.total * 100) + '%"></div>';

      callTokEl.textContent = fmt(b.total);
      callSubEl.innerHTML = SYSTEM.tok + ' System + ' + b.hist + ' Verlauf + ' + b.nu + ' neu';

      // cumulative
      var total = 0, sysPaid = 0;
      for (var c = 1; c <= revealed; c++) { total += breakdown(c).total; sysPaid += SYSTEM.tok; }
      totalTokEl.textContent = fmt(total);
      totalSubEl.innerHTML = 'davon <b style="color:#f0ece3">' + sysPaid + ' tok</b> allein für das System-Prompt';

      renderHist();

      // insight
      if (revealed === 1) {
        insightEl.innerHTML = 'Aufruf 1: System-Prompt + erste Frage. Noch günstig. Aber die Antwort landet jetzt im <strong>Verlauf</strong>.';
      } else {
        var ratio = (total / breakdown(1).total).toFixed(1);
        insightEl.innerHTML = 'Aufruf ' + revealed + ' schickt das <strong>komplette Gespräch erneut</strong> mit. Bisher ' + fmt(total) +
          ' Input — das <strong>' + ratio + '-fache</strong> des ersten Aufrufs, für dieselbe Unterhaltung.';
      }

      var done = revealed >= TURNS.length;
      histNoteEl.textContent = done ? 'jeder Aufruf trägt den ganzen Verlauf' : 'wächst mit jedem Turn';
    }

    function renderHist() {
      // max height reference = the final (most expensive) call
      var maxTok = breakdown(TURNS.length).total;
      var html = '';
      for (var t = 1; t <= TURNS.length; t++) {
        var shown = t <= revealed;
        var b = breakdown(t);
        var h = shown ? Math.max(6, (b.total / maxTok) * 84) : 0;
        var cur = (t === revealed) ? ' current' : '';
        html += '<div class="tally-hcol' + cur + '">';
        if (shown) {
          html += '<div class="tally-hbar" style="height:' + h + '%">' +
            '<div class="hb-seg new"  style="height:' + (b.nu / b.total * 100) + '%"></div>' +
            '<div class="hb-seg hist" style="height:' + (b.hist / b.total * 100) + '%"></div>' +
            '<div class="hb-seg sys"  style="height:' + (b.sys / b.total * 100) + '%"></div>' +
          '</div>';
        } else {
          html += '<div class="tally-hbar" style="height:4px;background:rgba(255,255,255,0.07)"></div>';
        }
        html += '<span class="hc-lbl">' + t + '</span></div>';
      }
      histEl.innerHTML = html;
    }

    nextBtn.addEventListener('click', function () {
      if (revealed >= TURNS.length) return;
      var added = breakdown(revealed + 1).total;
      revealed++;
      render();
      // emphasize that the cumulative bill just grew
      deltaEl.textContent = '+' + fmt(added);
      deltaEl.classList.remove('show'); void deltaEl.offsetWidth; deltaEl.classList.add('show');
      totalHeroEl.classList.remove('bump'); void totalHeroEl.offsetWidth; totalHeroEl.classList.add('bump');
    });
    resetBtn.addEventListener('click', function () {
      revealed = 0;
      deltaEl.textContent = ''; deltaEl.classList.remove('show');
      totalHeroEl.classList.remove('bump');
      render();
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
