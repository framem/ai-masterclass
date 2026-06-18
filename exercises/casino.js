/**
 * Exercise 1 — Next-Token Casino
 * 3 hand-authored prompts with realistic logits + linear completion.
 * Temperature slider applies softmax rescaling live.
 */
(function () {
  var section = document.querySelector('[data-screen-label*="Next-Token Casino"]');
  if (!section) return;

  // ---- Hand-authored data ----
  // logits chosen so first prompt is "sharp", second "flat", third "medium"
  var PROMPTS = [
    {
      id: 'fact',
      kind: 'Faktisch · scharfe Verteilung',
      prompt: 'Berlin ist die Hauptstadt von',
      shape: [85, 8, 4, 2, 1],
      candidates: [
        { token: ' Deutschland', logit: 8.5, completion: ' und mit 3,7 Millionen Einwohnern die größte Stadt des Landes.' },
        { token: ' Preußen',     logit: 4.1, completion: ' — historisch korrekt, bis das Land 1947 aufgelöst wurde.' },
        { token: ' der',         logit: 3.2, completion: ' Bundesrepublik Deutschland und Sitz der Bundesregierung.' },
        { token: ' Brandenburg', logit: 2.4, completion: ' — falsch. Brandenburg ist das Bundesland, das Berlin umgibt.' },
        { token: ' einer',       logit: 1.6, completion: ' der bedeutendsten Mediengruppen Europas. (Nicht der Stadt.)' }
      ]
    },
    {
      id: 'ambig',
      kind: 'Ambig · mittlere Verteilung',
      prompt: 'Das Modell antwortete dem Nutzer',
      shape: [44, 26, 14, 10, 6],
      candidates: [
        { token: ' mit',         logit: 6.2, completion: ' einer Liste von Schritten, höflich und nummeriert.' },
        { token: ' höflich',     logit: 5.7, completion: ', dass es dafür keine ausreichenden Informationen habe.' },
        { token: ' ausweichend', logit: 5.1, completion: ' — eine sichere Antwort, aber nicht wirklich hilfreich.' },
        { token: ' direkt',      logit: 4.8, completion: ': „Nein. Das ist eine schlechte Idee, weil ..."' },
        { token: ' und',         logit: 4.3, completion: ' fragte zurück, was genau er denn meine.' }
      ]
    },
    {
      id: 'flat',
      kind: 'Offen · flache Verteilung',
      prompt: 'Mein Lieblingstier ist',
      shape: [23, 21, 20, 19, 17],
      candidates: [
        { token: ' der',     logit: 4.4, completion: ' Hund — treu, verspielt und immer gut gelaunt.' },
        { token: ' die',     logit: 4.3, completion: ' Katze, weil sie so eigensinnig und elegant ist.' },
        { token: ' das',     logit: 4.2, completion: ' Pferd — kraftvoll und doch unglaublich sanft.' },
        { token: ' ein',     logit: 4.1, completion: ' Delfin: verspielt, klug und sozial.' },
        { token: ' mein',    logit: 4.0, completion: ' Wellensittich, der den ganzen Tag fröhlich pfeift.' }
      ]
    }
  ];

  // ---- Elements ----
  var listEl = section.querySelector('#casino-promptlist');
  var promptDisplay = section.querySelector('#casino-prompt-display');
  var candsEl = section.querySelector('#casino-cands');
  var sumEl = section.querySelector('#casino-sum');
  var completionEl = section.querySelector('#casino-completion');
  var sentenceEl = section.querySelector('#casino-sentence');
  var footEl = section.querySelector('#casino-foot-info');
  var resetBtn = section.querySelector('#casino-reset');
  var tempInput = section.querySelector('#casino-temp');
  var tempVal = section.querySelector('#casino-temp-val');
  var tempExplain = section.querySelector('#casino-temp-explain');

  // ---- State ----
  var activeId = PROMPTS[0].id;
  var temperature = 0.7;
  var picked = null;

  // ---- Math: softmax with temperature ----
  function softmax(logits, T) {
    var scaled = logits.map(function (l) { return l / T; });
    var maxL = Math.max.apply(null, scaled);
    var exps = scaled.map(function (l) { return Math.exp(l - maxL); });
    var sum = exps.reduce(function (a, b) { return a + b; }, 0);
    return exps.map(function (e) { return e / sum; });
  }

  // ---- Render prompt list ----
  function renderPromptList() {
    listEl.innerHTML = '';
    PROMPTS.forEach(function (p) {
      var item = document.createElement('div');
      item.className = 'cp-item' + (p.id === activeId ? ' active' : '');
      item.innerHTML =
        '<div class="cp-kind">' + p.kind + '</div>' +
        '<div class="cp-text">„' + p.prompt + ' <em style="color: var(--ink-3); font-style: normal;">…</em>"</div>' +
        '<div class="cp-shape">' +
          p.shape.map(function (h) {
            return '<div style="height: ' + (h * 0.6 + 4) + 'px;"></div>';
          }).join('') +
        '</div>';
      item.addEventListener('click', function () {
        activeId = p.id;
        picked = null;
        renderPromptList();
        pickGreedy();
      });
      listEl.appendChild(item);
    });
  }

  // ---- Render main column ----
  function renderMain() {
    var p = PROMPTS.find(function (x) { return x.id === activeId; });
    if (!p) return;

    // prompt display
    if (picked) {
      promptDisplay.innerHTML = p.prompt + '<span class="picked">' + picked.token + '</span>';
    } else {
      promptDisplay.innerHTML = p.prompt + '<span class="cursor"></span>';
    }

    // probabilities
    var logits = p.candidates.map(function (c) { return c.logit; });
    var probs = softmax(logits, temperature);

    // sorted indices by prob
    var idx = probs.map(function (_, i) { return i; }).sort(function (a, b) {
      return probs[b] - probs[a];
    });

    // greedy = idx[0]
    candsEl.innerHTML = '';
    idx.forEach(function (i, rank) {
      var c = p.candidates[i];
      var prob = probs[i];
      var pct = (prob * 100).toFixed(1);
      var row = document.createElement('div');
      row.className = 'casino-cand' + (rank === 0 ? ' greedy' : '');
      row.style.position = 'relative';
      row.innerHTML =
        '<span class="cc-token">' + c.token + '</span>' +
        '<span class="cc-bar"><div style="width: ' + (prob * 100) + '%;"></div></span>' +
        '<span class="cc-logit">logit ' + c.logit.toFixed(1) + '</span>' +
        '<span class="cc-prob">' + pct + '%</span>';

      row.addEventListener('click', function () {
        picked = c;
        renderMain();
        showCompletion(p, c);
      });
      candsEl.appendChild(row);
    });

    sumEl.textContent = 'Summe: ' + (probs.reduce(function (a, b) { return a + b; }, 0) * 100).toFixed(0) + '%';

    // hide completion if no pick
    if (!picked) {
      completionEl.classList.remove('show');
    }
  }

  // ---- Auto-select the greedy (most likely) token, so the completion box
  //      is visible by default and it's obvious the candidates are clickable.
  function pickGreedy() {
    var p = PROMPTS.find(function (x) { return x.id === activeId; });
    if (!p) return;
    var logits = p.candidates.map(function (c) { return c.logit; });
    var probs = softmax(logits, temperature);
    var topI = probs
      .map(function (_, i) { return i; })
      .sort(function (a, b) { return probs[b] - probs[a]; })[0];
    picked = p.candidates[topI];
    renderMain();
    showCompletion(p, picked);
  }

  function showCompletion(p, cand) {
    // animate-in
    completionEl.classList.add('show');
    sentenceEl.innerHTML =
      p.prompt + '<span class="picked-tok">' + cand.token + '</span>' + cand.completion;

    var rank = p.candidates.findIndex(function (x) { return x === cand; });
    var logits = p.candidates.map(function (c) { return c.logit; });
    var probs = softmax(logits, temperature);
    var sortedIdx = probs.map(function (_, i) { return i; }).sort(function (a, b) { return probs[b] - probs[a]; });
    var pickedRank = sortedIdx.indexOf(rank) + 1;

    var note;
    if (pickedRank === 1) {
      note = 'Du hast das Greedy-Token gewählt — bei T=' + temperature.toFixed(2) + ' das wahrscheinlichste.';
    } else if (pickedRank === 2) {
      note = 'Zweit-wahrscheinlich. Bei Sampling-Temperatur durchaus drin.';
    } else {
      note = 'Rang #' + pickedRank + ' — bei T=' + temperature.toFixed(2) + ' eher überraschend. Pures Greedy hätte das nie gewählt.';
    }
    footEl.textContent = note;
  }

  // ---- Temperature ----
  function updateTempExplain() {
    var msg;
    if (temperature <= 0.2) {
      msg = 'T ≈ ' + temperature.toFixed(2) + ' — fast deterministisch. Der Greedy-Pfad dominiert: das wahrscheinlichste Token fast immer.';
    } else if (temperature <= 0.7) {
      msg = 'T ≈ ' + temperature.toFixed(2) + ' — leichtes Sampling. Plausible Alternativen bekommen Chancen, Ausreißer eher nicht.';
    } else if (temperature <= 1.2) {
      msg = 'T ≈ ' + temperature.toFixed(2) + ' — neutrale Verteilung. Das Modell „spricht" so, wie es trainiert wurde.';
    } else {
      msg = 'T ≈ ' + temperature.toFixed(2) + ' — Chaos-Bereich. Auch Rang-5-Token werden plötzlich wahrscheinlich. Faktentreue leidet.';
    }
    tempExplain.textContent = msg;
  }

  tempInput.addEventListener('pointerdown', function () { tempInput.classList.add('touched'); });
  tempInput.addEventListener('input', function () {
    tempInput.classList.add('touched');
    temperature = parseFloat(tempInput.value);
    tempVal.textContent = temperature.toFixed(2);
    updateTempExplain();
    renderMain();
  });

  resetBtn.addEventListener('click', function () {
    picked = null;
    completionEl.classList.remove('show');
    renderMain();
  });

  // ---- Init ----
  renderPromptList();
  updateTempExplain();
  pickGreedy();
})();
