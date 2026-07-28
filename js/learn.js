/* ============================================================
   learn.js — lesson list + interactive lesson player
   ============================================================ */
(function (global) {
  'use strict';

  var el = UI.el;

  /* ---------------- lesson list ---------------- */
  var TRACKS = [
    {
      key: 'cn', name: 'Chinese', get lessons() { return LESSONS; },
      blurb: '<b>You invent the hand.</b> Any four sets and a pair wins — build whatever the tiles allow.'
    },
    {
      key: 'am', name: 'American', get lessons() { return AM_LESSONS; },
      blurb: '<b>You copy a hand.</b> A printed card fixes every legal hand; yours must match one exactly.'
    }
  ];

  var activeTrack = 'cn';

  function renderList() {
    var root = UI.$('#learn-body');
    root.innerHTML = '';

    var total = ALL_LESSONS.length;
    var done = Store.lessonsDoneCount();
    var head = el('div', 'sec-head');
    head.innerHTML = '<h2>Learn</h2><p class="muted">' + done + ' of ' + total +
      ' lessons complete across both games</p>';
    root.appendChild(head);

    // Track switcher
    var seg = el('div', 'segbar');
    TRACKS.forEach(function (tr) {
      var n = Store.lessonsDoneCount(tr.lessons);
      var b = el('button', 'seg' + (tr.key === activeTrack ? ' on' : ''),
        tr.name + ' <span class="seg-n">' + n + '/' + tr.lessons.length + '</span>');
      b.type = 'button';
      b.addEventListener('click', function () {
        activeTrack = tr.key;
        UI.sound('tap');
        renderList();
      });
      seg.appendChild(b);
    });
    root.appendChild(seg);

    var track = TRACKS.filter(function (t) { return t.key === activeTrack; })[0];
    var lessons = track.lessons;
    var tdone = Store.lessonsDoneCount(lessons);

    root.appendChild(el('p', 'track-blurb', track.blurb));

    var bar = el('div', 'track');
    bar.innerHTML = '<i style="width:' + Math.round(tdone / lessons.length * 100) + '%"></i>';
    root.appendChild(bar);

    if (activeTrack === 'am') {
      var noteBox = el('div', 'tipbox');
      noteBox.innerHTML = '<span class="tip-k">Note</span><p>The official National Mah Jongg ' +
        'League card is copyrighted and reissued yearly. This app teaches with an ' +
        '<strong>original card</strong> in the same style — same categories, same skills, ' +
        'no official hand reproduced.</p>';
      root.appendChild(noteBox);
    }

    var list = el('div', 'cards');
    lessons.forEach(function (L, i) {
      var prog = Store.data.lessons[L.id];
      var prev = i === 0 ? null : Store.data.lessons[lessons[i - 1].id];
      var locked = i > 0 && !(prev && prev.done);

      var c = el('button', 'card lesson-card' + (locked ? ' locked' : '') + (prog && prog.done ? ' done' : ''));
      c.type = 'button';
      c.innerHTML =
        '<span class="card-ico">' + (locked ? '🔒' : L.icon) + '</span>' +
        '<span class="card-main">' +
        '<span class="card-t">' + L.title + '</span>' +
        '<span class="card-s">' + L.sub + '</span>' +
        '</span>' +
        '<span class="card-side">' + (prog && prog.done ? stars(prog.stars) : '<span class="chev">›</span>') + '</span>';
      if (locked) {
        c.addEventListener('click', function () {
          UI.toast('Finish “' + lessons[i - 1].title + '” first');
          UI.sound('bad');
        });
      } else {
        c.addEventListener('click', function () { start(L); });
      }
      list.appendChild(c);
    });
    root.appendChild(list);
  }

  function showTrack(key) { activeTrack = key; renderList(); }

  function stars(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += '<span class="star' + (i < n ? ' on' : '') + '">★</span>';
    return '<span class="stars">' + s + '</span>';
  }

  /* ---------------- lesson player ---------------- */
  var S = null; // active session

  function start(L) {
    S = { lesson: L, i: 0, wrong: 0, answered: false, firstTry: true, picks: [] };
    UI.screen('lesson', { tab: 'learn', immersive: true });
    renderStep();
  }

  function progressPct() { return Math.round((S.i) / S.lesson.steps.length * 100); }

  function renderStep() {
    var step = S.lesson.steps[S.i];
    S.answered = false;
    S.firstTry = true;
    S.picks = [];

    UI.$('#lesson-title').textContent = S.lesson.title;
    UI.$('#lesson-count').textContent = (S.i + 1) + ' / ' + S.lesson.steps.length;
    UI.$('#lesson-bar').style.width = progressPct() + '%';

    var body = UI.$('#lesson-body');
    body.innerHTML = '';
    body.scrollTop = 0;
    hideResult();

    var render = RENDER[step.type];
    if (render) render(step, body);
    else body.appendChild(el('p', '', 'Unknown step.'));
  }

  function next() {
    S.i++;
    if (S.i >= S.lesson.steps.length) return finish();
    renderStep();
  }

  function finish() {
    var starCount = S.wrong === 0 ? 3 : S.wrong <= 2 ? 2 : 1;
    var isNew = Store.lessonDone(S.lesson.id, starCount);
    var xp = (isNew ? 30 : 8) + (S.wrong === 0 ? 15 : 0);
    Store.addXP(xp);

    UI.sound('win');
    if (starCount === 3) UI.confetti();

    var body = el('div', 'finish');
    body.innerHTML =
      '<div class="finish-ico">' + S.lesson.icon + '</div>' +
      stars(starCount) +
      '<p class="finish-sub">' + (S.wrong === 0
        ? 'Flawless. Not one slip.'
        : S.wrong + ' mistake' + (S.wrong === 1 ? '' : 's') + ' — worth a second run for the third star.') + '</p>' +
      '<div class="xp-pop">+' + xp + ' XP</div>';

    UI.modal({
      title: 'Lesson complete',
      body: body,
      dismissable: false,
      actions: [
        { label: 'Replay', onClick: function () { start(S.lesson); } },
        {
          label: 'Continue', cls: 'primary', onClick: function () {
            renderList();
            UI.screen('learn');
            App.refreshHome();
            UI.flushRewards();
          }
        }
      ]
    });
  }

  /* ---------------- result bar ---------------- */
  function hideResult() {
    var r = UI.$('#lesson-result');
    r.className = 'result';
    r.innerHTML = '';
  }

  function showResult(ok, why, onNext) {
    var r = UI.$('#lesson-result');
    r.className = 'result show ' + (ok ? 'ok' : 'no');
    r.innerHTML =
      '<div class="result-head"><span class="result-ico">' + (ok ? '✓' : '✕') + '</span>' +
      '<span class="result-t">' + (ok ? pickPraise() : 'Not quite') + '</span></div>' +
      (why ? '<div class="result-why">' + UI.md(why) + '</div>' : '');
    var b = el('button', 'btn primary wide', S.i + 1 >= S.lesson.steps.length ? 'Finish' : 'Continue');
    b.type = 'button';
    b.addEventListener('click', function () { (onNext || next)(); });
    r.appendChild(b);
    UI.sound(ok ? 'good' : 'bad');
    UI.haptic(ok ? 12 : 40);
    r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  var PRAISE = ['Correct', 'Exactly', 'That\'s it', 'Spot on', 'Yes', 'Well read'];
  function pickPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }

  function mark(ok) {
    if (!ok && S.firstTry) S.wrong++;
    if (ok && S.firstTry) Store.addXP(3);
    S.firstTry = false;
    S.answered = true;
  }

  /* ---------------- step renderers ---------------- */
  var RENDER = {};

  RENDER.info = function (step, body) {
    body.appendChild(el('div', 'prose', UI.md(step.text)));
    // A side-by-side comparison has to be side by side. Splitting it over two
    // steps means the reader never sees both halves at once.
    if (step.vs) body.appendChild(el('div', '', UI.vsBlock()));
    if (step.tiles) {
      body.appendChild(UI.tileRow(step.tiles, { wide: step.wide }));
    }
    if (step.caption) body.appendChild(el('p', 'caption', step.caption));
    if (step.after) body.appendChild(el('div', 'prose', UI.md(step.after)));
    var b = el('button', 'btn primary wide', S.i + 1 >= S.lesson.steps.length ? 'Finish' : 'Got it');
    b.type = 'button';
    b.addEventListener('click', function () { UI.sound('click'); next(); });
    body.appendChild(el('div', 'spacer'));
    body.appendChild(b);
  };

  RENDER.choice = function (step, body) {
    body.appendChild(el('div', 'prose q', UI.md(step.q)));
    if (step.tiles) body.appendChild(UI.tileRow(step.tiles, { wide: step.wide }));

    var opts = el('div', 'opts');
    step.options.forEach(function (text, i) {
      var b = el('button', 'opt', UI.esc(text));
      b.type = 'button';
      b.addEventListener('click', function () {
        if (S.answered) return;
        var ok = i === step.answer;
        mark(ok);
        UI.$$('.opt', opts).forEach(function (o) { o.disabled = true; });
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) UI.$$('.opt', opts)[step.answer].classList.add('right');
        showResult(ok, step.why);
      });
      opts.appendChild(b);
    });
    body.appendChild(opts);
  };

  RENDER.pick = function (step, body) {
    body.appendChild(el('div', 'prose q', UI.md(step.q)));
    if (step.hand) {
      body.appendChild(el('p', 'label-sm', 'Your hand'));
      body.appendChild(UI.tileRow(step.hand, { wide: true, cls: 'ctx' }));
      body.appendChild(el('p', 'label-sm', 'Choices'));
    }
    var need = step.count || step.answer.length;
    var chosen = [];

    var row = UI.tileRow(step.tiles, {
      onTap: function (t, i, node) {
        if (S.answered) return;
        var at = chosen.indexOf(i);
        if (at >= 0) { chosen.splice(at, 1); node.classList.remove('sel'); }
        else if (chosen.length < need) { chosen.push(i); node.classList.add('sel'); UI.sound('tap'); }
        else { UI.toast('Pick ' + need + ' tile' + (need === 1 ? '' : 's')); return; }
        counter.textContent = chosen.length + ' / ' + need + ' selected';
        check.disabled = chosen.length !== need;
      }
    });
    body.appendChild(row);

    var counter = el('p', 'caption', '0 / ' + need + ' selected');
    body.appendChild(counter);

    var check = el('button', 'btn primary wide', 'Check');
    check.type = 'button';
    check.disabled = true;
    check.addEventListener('click', function () {
      if (S.answered) return;
      var ok = chosen.length === step.answer.length &&
        chosen.slice().sort().join(',') === step.answer.slice().sort().join(',');
      mark(ok);
      UI.$$('.tile', row).forEach(function (n, i) {
        n.disabled = true;
        if (step.answer.indexOf(i) >= 0) n.classList.add('right');
        else if (chosen.indexOf(i) >= 0) n.classList.add('wrong');
        n.classList.remove('sel');
      });
      check.style.display = 'none';
      showResult(ok, step.why);
    });
    body.appendChild(check);
  };

  RENDER.build = function (step, body) {
    body.appendChild(el('div', 'prose q', UI.md(step.q)));
    var chosen = [];
    var row = UI.tileRow(step.pool, {
      onTap: function (t, i, node) {
        if (S.answered) return;
        var at = chosen.indexOf(i);
        if (at >= 0) { chosen.splice(at, 1); node.classList.remove('sel'); }
        else if (chosen.length < 3) { chosen.push(i); node.classList.add('sel'); UI.sound('tap'); }
        counter.textContent = chosen.length + ' / 3 selected';
        check.disabled = chosen.length !== 3;
      }
    });
    body.appendChild(row);
    var counter = el('p', 'caption', '0 / 3 selected');
    body.appendChild(counter);

    var check = el('button', 'btn primary wide', 'Check');
    check.type = 'button';
    check.disabled = true;
    check.addEventListener('click', function () {
      if (S.answered) return;
      var tiles = chosen.map(function (i) { return step.pool[i]; }).sort(function (a, b) { return a - b; });
      var kind = classify(tiles);
      var ok = kind === step.goal;
      mark(ok);
      UI.$$('.tile', row).forEach(function (n) { n.disabled = true; });
      check.style.display = 'none';
      showResult(ok, ok ? step.why : 'That group is ' + describe(kind) + '. You need a ' + step.goal + '.');
    });
    body.appendChild(check);
  };

  RENDER.discard = function (step, body) {
    body.appendChild(el('div', 'prose q', UI.md(step.q)));
    var picked = null;
    var row = UI.tileRow(step.hand, {
      wide: true,
      onTap: function (t, i, node) {
        if (S.answered) return;
        UI.$$('.tile', row).forEach(function (n) { n.classList.remove('sel'); });
        node.classList.add('sel');
        picked = t;
        UI.sound('tap');
        check.disabled = false;
        check.textContent = 'Discard ' + T.name(t);
      }
    });
    body.appendChild(row);
    body.appendChild(el('p', 'caption', 'Tap a tile, then confirm.'));

    var check = el('button', 'btn primary wide', 'Choose a tile');
    check.type = 'button';
    check.disabled = true;
    check.addEventListener('click', function () {
      if (S.answered || picked === null) return;
      var ok = step.answer.indexOf(picked) >= 0;
      mark(ok);
      UI.$$('.tile', row).forEach(function (n) {
        n.disabled = true;
        var t = +n.dataset.t;
        if (step.answer.indexOf(t) >= 0) n.classList.add('right');
        else if (t === picked) n.classList.add('wrong');
      });
      check.style.display = 'none';
      var why = step.why;
      if (!ok) {
        why = 'The better discard is ' +
          step.answer.map(function (t) { return '**' + T.name(t) + '**'; }).join(' or ') + '.\n\n' + why;
      }
      showResult(ok, why);
    });
    body.appendChild(check);
  };

  RENDER.sort = function (step, body) {
    body.appendChild(el('div', 'prose q', UI.md(step.q)));
    var answers = new Array(step.sets.length).fill(null);
    var LABELS = ['pair', 'pung', 'chow', 'none'];
    var NAMES = { pair: 'Pair', pung: 'Pung', chow: 'Chow', none: 'Not a set' };

    step.sets.forEach(function (grp, gi) {
      var box = el('div', 'sortbox');
      box.appendChild(UI.tileRow(grp.tiles, { small: true }));
      var btns = el('div', 'sortbtns');
      LABELS.forEach(function (lab) {
        var b = el('button', 'chip', NAMES[lab]);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (S.answered) return;
          UI.$$('.chip', btns).forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          answers[gi] = lab;
          UI.sound('tap');
          check.disabled = answers.indexOf(null) >= 0;
        });
        btns.appendChild(b);
      });
      box.appendChild(btns);
      body.appendChild(box);
    });

    var check = el('button', 'btn primary wide', 'Check all');
    check.type = 'button';
    check.disabled = true;
    check.addEventListener('click', function () {
      if (S.answered) return;
      var ok = step.sets.every(function (g, i) { return answers[i] === g.label; });
      mark(ok);
      UI.$$('.sortbox', body).forEach(function (box, i) {
        UI.$$('.chip', box).forEach(function (b) {
          b.disabled = true;
          var lab = LABELS[UI.$$('.chip', box).indexOf(b)];
          if (lab === step.sets[i].label) b.classList.add('right');
          else if (b.classList.contains('on')) b.classList.add('wrong');
        });
      });
      check.style.display = 'none';
      var why = step.why;
      if (!ok) {
        why = 'Correct answers: ' + step.sets.map(function (g) { return NAMES[g.label]; }).join(', ') + '.\n\n' + why;
      }
      showResult(ok, why);
    });
    body.appendChild(check);
  };

  /* ---------------- set classification (shared with drills) ---------------- */
  function classify(tiles) {
    var s = tiles.slice().sort(function (a, b) { return a - b; });
    if (s.length === 2) return s[0] === s[1] ? 'pair' : 'none';
    if (s.length !== 3) return 'none';
    if (s[0] === s[1] && s[1] === s[2]) return 'pung';
    if (s[0] < 27 && T.suitOf(s[0]) === T.suitOf(s[2]) &&
      s[1] === s[0] + 1 && s[2] === s[0] + 2) return 'chow';
    return 'none';
  }
  function describe(kind) {
    return { pair: 'a pair', pung: 'a pung', chow: 'a chow', none: 'not a valid set' }[kind];
  }

  function quit() {
    UI.modal({
      title: 'Leave the lesson?',
      body: '<p>Your progress in this lesson will not be saved.</p>',
      actions: [
        { label: 'Stay' },
        { label: 'Leave', cls: 'danger', onClick: function () { renderList(); UI.screen('learn'); } }
      ]
    });
  }

  global.Learn = {
    renderList: renderList, start: start, quit: quit,
    classify: classify, showTrack: showTrack
  };
})(window);
