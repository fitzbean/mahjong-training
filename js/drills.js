/* ============================================================
   drills.js — four procedurally generated practice games
   ============================================================ */
(function (global) {
  'use strict';

  var el = UI.el;
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { return Game.shuffle(a); }

  var DRILLS = [
    {
      id: 'rush', title: 'Tile Rush', icon: '⚡', mode: 'timed', seconds: 60,
      sub: 'Name tiles against the clock',
      blurb: 'Sixty seconds. Match tiles to names as fast as you can. Wrong answers cost you three seconds.'
    },
    {
      id: 'snap', title: 'Set Snap', icon: '🧩', mode: 'timed', seconds: 45,
      sub: 'Pair, pung, chow — or nothing',
      blurb: 'Classify each group before the clock runs out. Near-misses are designed to catch you.'
    },
    {
      id: 'discard', title: 'Discard Master', icon: '🎯', mode: 'lives', lives: 3,
      sub: 'Find the tile to throw',
      blurb: 'A fresh hand every time. Pick the discard that leaves you closest to winning. Three lives.'
    },
    {
      id: 'ready', title: 'Ready Check', icon: '📡', mode: 'lives', lives: 3,
      sub: 'Spot every winning tile',
      blurb: 'Each hand is one tile from a win. Find every tile that completes it — miss one and it counts against you.'
    }
  ];

  /* ============================================================
     Hand generation
     ============================================================ */
  function freshAvail() { return new Array(34).fill(4); }

  function takeChow(av) {
    for (var t = 0; t < 60; t++) {
      var suit = pick(['m', 'p', 's']), r = 1 + rnd(7);
      var a = T.idx(suit, r);
      if (av[a] > 0 && av[a + 1] > 0 && av[a + 2] > 0) {
        av[a]--; av[a + 1]--; av[a + 2]--;
        return [a, a + 1, a + 2];
      }
    }
    return null;
  }
  function takePung(av) {
    for (var t = 0; t < 60; t++) {
      var i = rnd(34);
      if (av[i] >= 3) { av[i] -= 3; return [i, i, i]; }
    }
    return null;
  }
  function takePair(av, honorBias) {
    for (var t = 0; t < 60; t++) {
      var i = honorBias && Math.random() < 0.3 ? 27 + rnd(7) : rnd(34);
      if (av[i] >= 2) { av[i] -= 2; return [i, i]; }
    }
    return null;
  }
  function takePartial(av) {
    for (var t = 0; t < 60; t++) {
      var kind = rnd(3);
      if (kind === 0) { // two of a kind
        var i = rnd(34);
        if (av[i] >= 2) { av[i] -= 2; return [i, i]; }
      } else {
        var suit = pick(['m', 'p', 's']);
        var gap = kind === 1 ? 1 : 2;
        var r = 1 + rnd(9 - gap);
        var a = T.idx(suit, r), b = a + gap;
        if (av[a] > 0 && av[b] > 0) { av[a]--; av[b]--; return [a, b]; }
      }
    }
    return null;
  }
  function takeLoose(av, hand) {
    // Prefer something genuinely disconnected from what is already held.
    for (var t = 0; t < 80; t++) {
      var i = Math.random() < 0.35 ? 27 + rnd(7) : rnd(27);
      if (av[i] <= 0) continue;
      var near = hand.some(function (h) {
        if (h === i) return true;
        if (h < 27 && i < 27 && T.suitOf(h) === T.suitOf(i)) return Math.abs(h - i) <= 2;
        return false;
      });
      if (!near) { av[i]--; return i; }
    }
    for (var j = 0; j < 34; j++) if (av[j] > 0) { av[j]--; return j; }
    return 0;
  }

  function buildHand(size) {
    var av = freshAvail(), hand = [];
    var nSets = 1 + rnd(3);
    for (var i = 0; i < nSets; i++) {
      var s = Math.random() < 0.62 ? takeChow(av) : takePung(av);
      if (s) hand = hand.concat(s);
    }
    if (Math.random() < 0.85) {
      var p = takePair(av, true);
      if (p) hand = hand.concat(p);
    }
    var guard = 0;
    while (hand.length < size && guard++ < 40) {
      if (size - hand.length >= 2 && Math.random() < 0.55) {
        var pa = takePartial(av);
        if (pa && hand.length + pa.length <= size) { hand = hand.concat(pa); continue; }
      }
      hand.push(takeLoose(av, hand));
    }
    return hand.slice(0, size).sort(function (a, b) { return a - b; });
  }

  /* ---- Discard Master puzzle ---- */
  function makeDiscardPuzzle() {
    for (var attempt = 0; attempt < 300; attempt++) {
      var hand = buildHand(14);
      var rated = R.rateDiscards(R.counts(hand), 0);
      if (!rated.length) continue;
      var bestSh = rated[0].shanten;
      if (bestSh < 0 || bestSh > 3) continue;

      var bestU = rated[0].ukeire;
      var accepted = rated.filter(function (r) { return r.shanten === bestSh && r.ukeire === bestU; });
      if (accepted.length > 3) continue;

      var rest = rated.filter(function (r) { return !(r.shanten === bestSh && r.ukeire === bestU); });
      if (!rest.length) continue;

      // Only ship the puzzle if the right answer is clearly the right answer.
      var clear = rest[0].shanten > bestSh || (bestU - rest[0].ukeire) >= 4;
      if (!clear) continue;

      return { hand: hand, rated: rated, accepted: accepted.map(function (r) { return r.tile; }), shanten: bestSh };
    }
    var h = buildHand(14);
    var rd = R.rateDiscards(R.counts(h), 0);
    return { hand: h, rated: rd, accepted: [rd[0].tile], shanten: rd[0].shanten };
  }

  /* ---- Ready Check puzzle ---- */
  function makeReadyPuzzle() {
    for (var attempt = 0; attempt < 400; attempt++) {
      var av = freshAvail(), hand = [];
      var ok = true;
      var tanki = Math.random() < 0.22;
      var nSets = tanki ? 4 : 3;
      for (var i = 0; i < nSets; i++) {
        var s = Math.random() < 0.6 ? takeChow(av) : takePung(av);
        if (!s) { ok = false; break; }
        hand = hand.concat(s);
      }
      if (!ok) continue;

      if (tanki) {
        hand.push(takeLoose(av, hand));
      } else {
        var p = takePair(av, true);
        var pa = takePartial(av);
        if (!p || !pa) continue;
        hand = hand.concat(p).concat(pa);
      }
      if (hand.length !== 13) continue;

      var c = R.counts(hand);
      if (R.shanten(c, 0) !== 0) continue;
      var waits = R.winningTiles(c, 0);
      if (!waits.length || waits.length > 3) continue;

      // Decoys: plausible-looking tiles that do not actually win.
      var decoys = [];
      var guard = 0;
      while (decoys.length < 6 - waits.length && guard++ < 200) {
        var base = hand[rnd(hand.length)];
        var cand;
        if (base < 27 && Math.random() < 0.75) {
          var off = pick([-2, -1, 1, 2]);
          var r = T.rankOf(base) + off;
          if (r < 1 || r > 9) continue;
          cand = T.idx(T.suitOf(base), r);
        } else {
          cand = rnd(34);
        }
        if (waits.indexOf(cand) >= 0 || decoys.indexOf(cand) >= 0) continue;
        decoys.push(cand);
      }
      if (decoys.length < 6 - waits.length) continue;

      var choices = shuffle(waits.concat(decoys));
      return { hand: hand, waits: waits, choices: choices };
    }
    return null;
  }

  /* ---- Tile Rush question ---- */
  function makeRushQuestion() {
    var target = rnd(34);
    var reverse = Math.random() < 0.5;
    var decoys = [];
    var guard = 0;
    while (decoys.length < (reverse ? 5 : 3) && guard++ < 200) {
      var d;
      var roll = Math.random();
      if (roll < 0.5 && target < 27) {
        // same suit, nearby rank — the genuinely confusable ones
        var r = T.rankOf(target) + pick([-2, -1, 1, 2]);
        if (r < 1 || r > 9) continue;
        d = T.idx(T.suitOf(target), r);
      } else if (roll < 0.8 && target < 27) {
        // same number, different suit
        d = T.idx(pick(['m', 'p', 's']), T.rankOf(target));
      } else {
        d = rnd(34);
      }
      if (d === target || decoys.indexOf(d) >= 0) continue;
      decoys.push(d);
    }
    var all = shuffle([target].concat(decoys));
    return { target: target, choices: all, reverse: reverse };
  }

  /* ---- Set Snap question ---- */
  function makeSnapQuestion() {
    var roll = Math.random();
    var av = freshAvail();
    if (roll < 0.27) {
      return { tiles: takeChow(av), answer: 'chow' };
    } else if (roll < 0.5) {
      return { tiles: takePung(av), answer: 'pung' };
    } else if (roll < 0.72) {
      return { tiles: takePair(av, true), answer: 'pair' };
    }
    // A near-miss. These are the ones that teach.
    var kind = rnd(4);
    if (kind === 0) {
      // gapped run
      var suit = pick(['m', 'p', 's']), r = 1 + rnd(6);
      var a = T.idx(suit, r);
      return { tiles: [a, a + 1, a + 3], answer: 'none' };
    }
    if (kind === 1) {
      // same rank, mixed suits
      var rr = 1 + rnd(9);
      return { tiles: [T.idx('m', rr), T.idx('p', rr), T.idx('s', rr)], answer: 'none' };
    }
    if (kind === 2) {
      // consecutive honours — looks like a run, is not
      var h = 27 + rnd(2);
      return { tiles: [h, h + 1, h + 2], answer: 'none' };
    }
    // run split across two suits
    var s2 = pick(['m', 'p', 's']), other = pick(['m', 'p', 's'].filter(function (x) { return x !== s2; }));
    var r2 = 1 + rnd(7);
    return { tiles: [T.idx(s2, r2), T.idx(s2, r2 + 1), T.idx(other, r2 + 2)], answer: 'none' };
  }

  /* ============================================================
     Drill list screen
     ============================================================ */
  function renderList() {
    var root = UI.$('#drills-body');
    root.innerHTML = '';
    var head = el('div', 'sec-head');
    head.innerHTML = '<h2>Drills</h2><p class="muted">Endless generated puzzles. Chase your best score.</p>';
    root.appendChild(head);

    var list = el('div', 'cards');
    DRILLS.forEach(function (D) {
      var rec = Store.data.drills[D.id] || { best: 0, plays: 0 };
      var c = el('button', 'card drill-card');
      c.type = 'button';
      c.innerHTML =
        '<span class="card-ico">' + D.icon + '</span>' +
        '<span class="card-main"><span class="card-t">' + D.title + '</span>' +
        '<span class="card-s">' + D.sub + '</span></span>' +
        '<span class="card-side"><span class="best">' + (rec.best || '—') + '</span><span class="best-l">best</span></span>';
      c.addEventListener('click', function () { intro(D); });
      list.appendChild(c);
    });
    root.appendChild(list);
  }

  function intro(D) {
    var rec = Store.data.drills[D.id] || { best: 0, plays: 0 };
    UI.modal({
      title: D.icon + '  ' + D.title,
      body: '<p>' + D.blurb + '</p>' +
        '<p class="muted small">' + (D.mode === 'timed' ? D.seconds + ' seconds' : D.lives + ' lives') +
        ' · best ' + (rec.best || 0) + ' · played ' + rec.plays + '×</p>',
      actions: [
        { label: 'Back' },
        { label: 'Start', cls: 'primary', onClick: function () { run(D); } }
      ]
    });
  }

  /* ============================================================
     Runner
     ============================================================ */
  var A = null; // active drill session

  function run(D) {
    stop();
    A = {
      D: D, score: 0, streak: 0, bestStreak: 0, lives: D.lives || 0,
      left: (D.seconds || 0) * 1000, last: Date.now(), timer: null, locked: false
    };
    UI.screen('drill', { tab: 'drills', immersive: true });
    UI.$('#drill-title').textContent = D.title;
    updateHud();
    if (D.mode === 'timed') {
      A.timer = setInterval(tick, 100);
    }
    nextQuestion();
  }

  function tick() {
    var now = Date.now();
    A.left -= (now - A.last);
    A.last = now;
    if (A.left <= 0) { A.left = 0; updateHud(); return gameOver(); }
    updateHud();
  }

  function stop() {
    if (A && A.timer) clearInterval(A.timer);
    if (A) A.timer = null;
  }

  function updateHud() {
    UI.$('#drill-score').textContent = A.score;
    var meter = UI.$('#drill-meter');
    if (A.D.mode === 'timed') {
      var pct = Math.max(0, A.left / (A.D.seconds * 1000) * 100);
      meter.innerHTML = '<div class="track slim"><i style="width:' + pct + '%"></i></div>' +
        '<span class="clock">' + Math.ceil(A.left / 1000) + 's</span>';
      meter.classList.toggle('urgent', A.left < 10000);
    } else {
      var hearts = '';
      for (var i = 0; i < A.D.lives; i++) hearts += '<span class="heart' + (i < A.lives ? '' : ' off') + '">♥</span>';
      meter.innerHTML = hearts;
    }
    UI.$('#drill-streak').textContent = A.streak > 1 ? '🔥 ' + A.streak : '';
  }

  function correct(bonus) {
    A.score += (bonus || 1);
    A.streak++;
    A.bestStreak = Math.max(A.bestStreak, A.streak);
    if (A.streak > 0 && A.streak % 5 === 0) {
      A.score += 2;
      UI.toast('🔥 ' + A.streak + ' in a row  +2');
    }
    UI.sound('good');
    UI.haptic(12);
    updateHud();
  }

  function wrong(penaltySeconds) {
    A.streak = 0;
    UI.sound('bad');
    UI.haptic(45);
    if (A.D.mode === 'timed') A.left = Math.max(0, A.left - (penaltySeconds || 3) * 1000);
    else {
      A.lives--;
      if (A.lives <= 0) { updateHud(); setTimeout(gameOver, 900); return true; }
    }
    updateHud();
    return false;
  }

  function advance(delay) {
    setTimeout(function () {
      if (!A || (A.D.mode === 'timed' && A.left <= 0)) return;
      if (A.D.mode === 'lives' && A.lives <= 0) return;
      nextQuestion();
    }, delay || 650);
  }

  function nextQuestion() {
    if (!A) return;
    A.locked = false;
    var body = UI.$('#drill-body-in');
    body.innerHTML = '';
    body.classList.remove('flash-ok', 'flash-no');
    QUESTION[A.D.id](body);
  }

  function flash(ok) {
    var body = UI.$('#drill-body-in');
    body.classList.add(ok ? 'flash-ok' : 'flash-no');
  }

  /* ---------------- per-drill question renderers ---------------- */
  var QUESTION = {};

  QUESTION.rush = function (body) {
    var q = makeRushQuestion();
    if (q.reverse) {
      body.appendChild(el('p', 'drill-q', 'Tap the tile'));
      body.appendChild(el('h2', 'drill-big', T.name(q.target)));
      var grid = el('div', 'tile-grid');
      q.choices.forEach(function (t) {
        var n = T.el(t);
        n.addEventListener('click', function () {
          if (A.locked) return;
          A.locked = true;
          var ok = t === q.target;
          n.classList.add(ok ? 'right' : 'wrong');
          if (!ok) {
            UI.$$('.tile', grid).forEach(function (x) {
              if (+x.dataset.t === q.target) x.classList.add('right');
            });
          }
          flash(ok);
          if (ok) correct(); else if (wrong(3)) return;
          advance(ok ? 420 : 900);
        });
        grid.appendChild(n);
      });
      body.appendChild(grid);
    } else {
      body.appendChild(el('p', 'drill-q', 'Which tile is this?'));
      body.appendChild(UI.tileRow([q.target], { cls: 'solo' }));
      var opts = el('div', 'opts');
      q.choices.forEach(function (t) {
        var b = el('button', 'opt', T.name(t));
        b.type = 'button';
        b.addEventListener('click', function () {
          if (A.locked) return;
          A.locked = true;
          var ok = t === q.target;
          UI.$$('.opt', opts).forEach(function (o) {
            o.disabled = true;
            if (o.textContent === T.name(q.target)) o.classList.add('right');
          });
          if (!ok) b.classList.add('wrong');
          flash(ok);
          if (ok) correct(); else if (wrong(3)) return;
          advance(ok ? 420 : 900);
        });
        opts.appendChild(b);
      });
      body.appendChild(opts);
    }
  };

  QUESTION.snap = function (body) {
    var q = makeSnapQuestion();
    body.appendChild(el('p', 'drill-q', 'What is this?'));
    body.appendChild(UI.tileRow(q.tiles, { cls: 'solo' }));
    var LABELS = [['pair', 'Pair'], ['pung', 'Pung'], ['chow', 'Chow'], ['none', 'Not a set']];
    var opts = el('div', 'opts grid2');
    LABELS.forEach(function (L) {
      var b = el('button', 'opt', L[1]);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (A.locked) return;
        A.locked = true;
        var ok = L[0] === q.answer;
        UI.$$('.opt', opts).forEach(function (o, i) {
          o.disabled = true;
          if (LABELS[i][0] === q.answer) o.classList.add('right');
        });
        if (!ok) b.classList.add('wrong');
        flash(ok);
        if (ok) correct(); else if (wrong(3)) return;
        advance(ok ? 380 : 850);
      });
      opts.appendChild(b);
    });
    body.appendChild(opts);
  };

  QUESTION.discard = function (body) {
    var p = makeDiscardPuzzle();
    body.appendChild(el('p', 'drill-q', 'Which tile do you throw?'));
    body.appendChild(el('p', 'drill-hint', p.shanten === 0
      ? 'This hand is already ready — keep it that way.'
      : p.shanten + ' tile' + (p.shanten === 1 ? '' : 's') + ' from ready.'));

    var picked = null;
    var row = UI.tileRow(p.hand, {
      wide: true,
      onTap: function (t, i, node) {
        if (A.locked) return;
        UI.$$('.tile', row).forEach(function (n) { n.classList.remove('sel'); });
        node.classList.add('sel');
        picked = t;
        UI.sound('tap');
        go.disabled = false;
        go.textContent = 'Throw ' + T.name(t);
      }
    });
    body.appendChild(row);

    var go = el('button', 'btn primary wide', 'Pick a tile');
    go.type = 'button';
    go.disabled = true;
    go.addEventListener('click', function () {
      if (A.locked || picked === null) return;
      A.locked = true;
      var ok = p.accepted.indexOf(picked) >= 0;
      UI.$$('.tile', row).forEach(function (n) {
        n.disabled = true;
        var t = +n.dataset.t;
        if (p.accepted.indexOf(t) >= 0) n.classList.add('right');
        else if (t === picked) n.classList.add('wrong');
      });
      go.style.display = 'none';
      flash(ok);

      var best = p.rated[0];
      var mine = p.rated.filter(function (r) { return r.tile === picked; })[0];
      var names = p.accepted.map(T.name);
      var label = names.length === 1 ? names[0]
        : names.slice(0, -1).join(', ') + ' or ' + names[names.length - 1];
      var expl = el('div', 'drill-expl');
      expl.innerHTML =
        '<p><strong>' + label + '</strong> leave' + (names.length === 1 ? 's' : '') +
        ' you ' + shDesc(best.shanten) + ' with <strong>' + best.ukeire +
        '</strong> useful tiles live' +
        (names.length > 1 ? ' — they are equally good here' : '') + '.</p>' +
        (ok ? '' : '<p class="muted">Your pick left ' + shDesc(mine.shanten) +
          ' with ' + mine.ukeire + '.</p>');
      body.appendChild(expl);

      if (ok) correct(2); else if (wrong()) return;
      var nb = el('button', 'btn primary wide', 'Next hand');
      nb.type = 'button';
      nb.addEventListener('click', function () { nextQuestion(); });
      body.appendChild(nb);
    });
    body.appendChild(go);
  };

  function shDesc(sh) {
    if (sh < 0) return 'a completed hand';
    if (sh === 0) return 'ready to win';
    return sh + ' away';
  }

  QUESTION.ready = function (body) {
    var p = makeReadyPuzzle();
    if (!p) { advance(50); return; }
    body.appendChild(el('p', 'drill-q', 'Tap every tile that wins this hand'));
    body.appendChild(el('p', 'drill-hint', 'There ' + (p.waits.length === 1 ? 'is 1 answer' : 'are ' + p.waits.length + ' answers') + '.'));
    body.appendChild(UI.tileRow(p.hand, { wide: true, cls: 'ctx', small: true }));
    body.appendChild(el('p', 'label-sm', 'Candidates'));

    var chosen = [];
    var grid = el('div', 'tile-grid');
    p.choices.forEach(function (t, i) {
      var n = T.el(t);
      n.addEventListener('click', function () {
        if (A.locked) return;
        var at = chosen.indexOf(i);
        if (at >= 0) { chosen.splice(at, 1); n.classList.remove('sel'); }
        else { chosen.push(i); n.classList.add('sel'); UI.sound('tap'); }
        go.disabled = chosen.length === 0;
      });
      grid.appendChild(n);
    });
    body.appendChild(grid);

    var go = el('button', 'btn primary wide', 'Lock it in');
    go.type = 'button';
    go.disabled = true;
    go.addEventListener('click', function () {
      if (A.locked) return;
      A.locked = true;
      var chosenTiles = chosen.map(function (i) { return p.choices[i]; }).sort();
      var ok = chosenTiles.join(',') === p.waits.slice().sort().join(',');
      UI.$$('.tile', grid).forEach(function (n, i) {
        n.disabled = true;
        n.classList.remove('sel');
        var t = p.choices[i];
        if (p.waits.indexOf(t) >= 0) n.classList.add('right');
        else if (chosen.indexOf(i) >= 0) n.classList.add('wrong');
      });
      go.style.display = 'none';
      flash(ok);

      var expl = el('div', 'drill-expl');
      expl.innerHTML = '<p>Winning tile' + (p.waits.length > 1 ? 's' : '') + ': <strong>' +
        p.waits.map(T.name).join(', ') + '</strong></p>';
      body.appendChild(expl);

      if (ok) correct(2); else if (wrong()) return;
      var nb = el('button', 'btn primary wide', 'Next hand');
      nb.type = 'button';
      nb.addEventListener('click', function () { nextQuestion(); });
      body.appendChild(nb);
    });
    body.appendChild(go);
  };

  /* ---------------- game over ---------------- */
  function gameOver() {
    stop();
    var D = A.D, score = A.score;
    var isBest = Store.drillResult(D.id, score);
    var xp = Math.round(score * 1.5) + (isBest ? 15 : 0);
    Store.addXP(xp);

    if (D.id === 'rush' && score >= 25) Store.award('sharp-eye');
    if (D.id === 'snap' && A.bestStreak >= 15) Store.award('snap');
    if (D.id === 'discard' && score >= 10) Store.award('tactician');
    if (D.id === 'ready' && score >= 10) Store.award('radar');

    UI.sound(score > 0 ? 'win' : 'lose');
    if (isBest && score > 0) UI.confetti();

    var body = el('div', 'finish');
    body.innerHTML =
      '<div class="finish-ico">' + D.icon + '</div>' +
      '<div class="bigscore">' + score + '</div>' +
      '<p class="finish-sub">' + (isBest && score > 0 ? 'New personal best!' :
        'Best: ' + (Store.data.drills[D.id].best || 0)) + '</p>' +
      '<p class="muted small">Longest streak ' + A.bestStreak + '</p>' +
      '<div class="xp-pop">+' + xp + ' XP</div>';

    UI.modal({
      title: 'Time!',
      body: body,
      dismissable: false,
      actions: [
        { label: 'Again', onClick: function () { run(D); } },
        {
          label: 'Done', cls: 'primary', onClick: function () {
            renderList();
            UI.screen('drills');
            App.refreshHome();
            UI.flushRewards();
          }
        }
      ]
    });
  }

  function quit() {
    UI.modal({
      title: 'End this run?',
      body: '<p>Your score so far will still be recorded.</p>',
      actions: [
        { label: 'Keep going' },
        { label: 'End run', cls: 'danger', onClick: function () { gameOver(); } }
      ]
    });
  }

  global.Drills = {
    renderList: renderList, quit: quit, stop: stop,
    makeDiscardPuzzle: makeDiscardPuzzle, makeReadyPuzzle: makeReadyPuzzle
  };
})(window);
