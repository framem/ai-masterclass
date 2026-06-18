/**
 * Übung A — Effort-Dial (Wissenscheck-Variante).
 *
 * Pick a task, then set the reasoning-effort dial (Niedrig / Mittel / Hoch).
 * Cost & Latency update live — they're the knowable price of each level.
 * Quality and the verdict are HIDDEN until the learner commits via the
 * "Antwort prüfen" button: predict the cheapest level that still delivers
 * good quality, then check. A per-task "sweet spot" drives the verdict:
 * correct hit, overkill (wasted tokens), under-powered, or overthinking.
 *
 * Changing the level or the task re-hides quality + verdict and restores
 * the prompt — every new dial position is a fresh prediction.
 *
 * No persistence, no API. Mounts into the slide via data-screen-label.
 */
(function () {
  'use strict';

  var LEVELS = [
    { name: 'Niedrig', tag: 'low',    rtok: 60,   lat: 0.8 },
    { name: 'Mittel',  tag: 'medium', rtok: 450,  lat: 3.5 },
    { name: 'Hoch',    tag: 'high',   rtok: 2000, lat: 14  }
  ];
  var MAX_TOK = 2000, MAX_LAT = 14;

  // Two audience framings. Same pedagogy (sweet-spots, quality curves),
  // different task wording for a dev vs. non-dev room.
  var TASKS_BY_ROLE = {
    dev: [
      {
        id: 'extract',
        tag: 'Einfach',
        text: 'Extrahiere alle TODO-Kommentare aus dieser Datei und liste sie als Tabelle.',
        quality: [97, 98, 98],
        sweet: 0
      },
      {
        id: 'commit',
        tag: 'Mittel',
        text: 'Schreibe eine aussagekräftige Commit-Message für dieses Diff.',
        quality: [72, 90, 91],
        sweet: 1
      },
      {
        id: 'bug',
        tag: 'Schwer',
        text: 'Finde den Off-by-one-Bug, der nur bei leeren Eingaben auftritt — über 4 Dateien.',
        quality: [36, 66, 92],
        sweet: 2
      },
      {
        id: 'classify',
        tag: 'Einfach',
        text: 'Klassifiziere 300 Log-Zeilen nach Schweregrad (info / warn / error).',
        quality: [96, 97, 97],
        sweet: 0
      },
      {
        id: 'docstrings',
        tag: 'Mittel',
        text: 'Schreibe Docstrings für ein mittelgroßes Modul mit 15 Methoden.',
        quality: [73, 90, 91],
        sweet: 1
      },
      {
        id: 'trap',
        tag: 'Falle',
        text: 'Welcher HTTP-Status passt für „Ressource nicht gefunden“?',
        quality: [97, 94, 86],
        sweet: 0
      }
    ],
    nondev: [
      {
        id: 'extract',
        tag: 'Einfach',
        text: 'Extrahiere alle Termine und Uhrzeiten aus dieser E-Mail und liste sie auf.',
        quality: [97, 98, 98],
        sweet: 0
      },
      {
        id: 'reject',
        tag: 'Mittel',
        text: 'Schreibe eine freundliche, aber klare Absage an eine:n Bewerber:in.',
        quality: [70, 90, 91],
        sweet: 1
      },
      {
        id: 'offsite',
        tag: 'Schwer',
        text: 'Plane die Agenda für einen 2-tägigen Offsite — 6 Themen, Pausen, Abhängigkeiten.',
        quality: [40, 67, 92],
        sweet: 2
      },
      {
        id: 'sort',
        tag: 'Einfach',
        text: 'Sortiere 80 Rückmeldungen in „positiv / neutral / negativ“.',
        quality: [96, 97, 97],
        sweet: 0
      },
      {
        id: 'summary',
        tag: 'Mittel',
        text: 'Fasse ein 20-seitiges Protokoll auf eine halbe Seite zusammen.',
        quality: [72, 90, 91],
        sweet: 1
      },
      {
        id: 'trap',
        tag: 'Falle',
        text: 'Stimmt diese Anrede: „Sehr geehrte Frau Dr. Weber“? Ja oder Nein.',
        quality: [97, 94, 86],
        sweet: 0
      }
    ]
  };

  function qClass(q) { return q >= 85 ? 'q-ok' : (q >= 60 ? 'q-mid' : 'q-bad'); }
  function fmtLat(s) { return s < 1 ? (s * 1000).toFixed(0) + ' ms' : s.toFixed(1).replace('.', ',') + ' s'; }

  function init() {
    var section = document.querySelector('section[data-screen-label*="Effort-Dial"]');
    if (!section) return;

    var tasksEl   = section.querySelector('#dial-tasks');
    var slider    = section.querySelector('#dial-slider');
    var ticksEl   = section.querySelector('#dial-ticks');
    var levelName = section.querySelector('#dial-level-name');

    var qVal = section.querySelector('#m-quality'), qBar = section.querySelector('#m-quality-bar');
    var cVal = section.querySelector('#m-cost'),    cBar = section.querySelector('#m-cost-bar');
    var lVal = section.querySelector('#m-latency'), lBar = section.querySelector('#m-latency-bar');

    var verdictBox  = section.querySelector('#dial-verdict');
    var verdictLbl  = section.querySelector('#dial-verdict-label');
    var verdictText = section.querySelector('#dial-verdict-text');
    var checkPrompt = section.querySelector('#dial-check-prompt');
    var checkBtn    = section.querySelector('#dial-check');

    var activeTask = 0;
    var level = 1;
    var checked = false;
    var role = section.dataset.role || 'dev';
    var TASKS = TASKS_BY_ROLE[role] || TASKS_BY_ROLE.dev;

    // ---- build task cards ----
    function buildTasks() {
      tasksEl.innerHTML = '';
      TASKS.forEach(function (t, i) {
        var card = document.createElement('div');
        card.className = 'dial-task' + (i === activeTask ? ' active' : '');
        card.innerHTML = '<div class="dt-text">' + t.text + '</div>';
        card.addEventListener('click', function () {
          activeTask = i;
          Array.prototype.forEach.call(tasksEl.children, function (c, j) {
            c.classList.toggle('active', j === i);
          });
          resetCheck();
        });
        tasksEl.appendChild(card);
      });
    }
    buildTasks();

    // ---- audience switch: swap the whole task set, restart on first task ----
    section.addEventListener('rolechange', function (e) {
      role = (e.detail && e.detail.role) || 'dev';
      TASKS = TASKS_BY_ROLE[role] || TASKS_BY_ROLE.dev;
      activeTask = 0;
      buildTasks();
      resetCheck();
    });

    // ---- slider ----
    slider.addEventListener('input', function () {
      slider.classList.add('touched');
      level = parseInt(slider.value, 10);
      resetCheck();
    });
    Array.prototype.forEach.call(ticksEl.children, function (sp) {
      sp.addEventListener('click', function () {
        slider.classList.add('touched');
        level = parseInt(sp.getAttribute('data-lvl'), 10);
        slider.value = level;
        resetCheck();
      });
    });

    // ---- check button: reveal quality + verdict for the current choice ----
    checkBtn.addEventListener('click', reveal);

    // Live meters: level name, ticks, cost, latency always reflect the dial.
    // Quality is gated — shown only once the learner has checked.
    function renderLive() {
      var t = TASKS[activeTask];
      var L = LEVELS[level];

      levelName.textContent = L.name;
      Array.prototype.forEach.call(ticksEl.children, function (sp, j) {
        sp.classList.toggle('on', j === level);
      });

      cVal.textContent = L.rtok.toLocaleString('de-DE') + ' tok';
      cBar.style.width = Math.max(3, (L.rtok / MAX_TOK) * 100) + '%';

      lVal.textContent = fmtLat(L.lat);
      lBar.style.width = Math.max(4, (L.lat / MAX_LAT) * 100) + '%';

      if (checked) {
        var q = t.quality[level];
        qVal.textContent = q + ' %';
        qVal.className = 'dm-val ' + qClass(q);
        qBar.style.width = q + '%';
      } else {
        qVal.textContent = '?';
        qVal.className = 'dm-val q-hidden';
        qBar.style.width = '0%';
      }
    }

    // Back to "predict" state: hide quality + verdict, show the prompt.
    function resetCheck() {
      checked = false;
      checkPrompt.hidden = false;
      verdictBox.hidden = true;
      renderLive();
    }

    // Commit: reveal quality + verdict for the current task/level.
    function reveal() {
      checked = true;
      checkPrompt.hidden = true;
      verdictBox.hidden = false;
      renderLive();
      renderVerdict();
    }

    function renderVerdict() {
      var t = TASKS[activeTask];
      var L = LEVELS[level];
      var q = t.quality[level];

      verdictBox.classList.remove('ok', 'over', 'under');
      // "trap" = quality actually drops when effort rises past the sweet spot
      var isTrap = t.quality[LEVELS.length - 1] < t.quality[t.sweet];
      if (level === t.sweet) {
        var dirs = [];
        if (t.sweet > 0) dirs.push('niedriger und die Qualität bricht ein');
        if (t.sweet < LEVELS.length - 1) dirs.push(isTrap ? 'höher wird die Antwort sogar schlechter' : 'höher und du zahlst nur drauf');
        verdictBox.classList.add('ok');
        verdictLbl.textContent = '✓ Sweet-Spot';
        verdictText.innerHTML = '<strong>Genau richtig.</strong> Beste Qualität pro Token — ' + dirs.join(', ') + '.';
      } else if (level > t.sweet) {
        var sw = LEVELS[t.sweet];
        var dq = q - t.quality[t.sweet];
        var tokRatio = (L.rtok / sw.rtok);
        var latRatio = (L.lat / sw.lat);
        var tokTxt = tokRatio.toFixed(tokRatio >= 10 ? 0 : 1).replace('.', ',');
        var latTxt = latRatio.toFixed(latRatio >= 10 ? 0 : 1).replace('.', ',');
        verdictBox.classList.add('over');
        if (dq < 0) {
          verdictLbl.textContent = 'Overthinking';
          verdictText.innerHTML = '<strong>Schlechter statt besser.</strong> <strong>−' + Math.abs(dq) +
            ' Punkte</strong> Qualität bei rund <strong>' + tokTxt + '×</strong> Tokens — das Modell zerdenkt eine eindeutige Aufgabe. „' +
            sw.name + '" hätte gereicht.';
        } else {
          verdictLbl.textContent = 'Overkill';
          verdictText.innerHTML = '<strong>Verschwendung.</strong> Nur <strong>' + (dq === 0 ? '±0' : '+' + dq) + ' Punkte</strong> Qualität, aber rund <strong>' +
            tokTxt + '×</strong> Tokens und <strong>' + latTxt + '×</strong> Latenz. „' + sw.name + '" hätte gereicht.';
        }
      } else {
        var swU = LEVELS[t.sweet];
        verdictBox.classList.add('under');
        verdictLbl.textContent = 'Zu wenig';
        verdictText.innerHTML = '<strong>Unterversorgt.</strong> Die Aufgabe braucht mehr Nachdenken — Qualität bei <strong>' + q +
          ' %</strong>, mit „' + swU.name + '" wären <strong>' + t.quality[t.sweet] + ' %</strong> drin.';
      }
    }

    resetCheck();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
