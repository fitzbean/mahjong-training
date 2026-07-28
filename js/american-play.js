/* ============================================================
   american-play.js — the American mahjong table
   ============================================================ */
(function (global) {
  'use strict';

  var el = UI.el;
  var G = null;
  var SPEED = 620;
  var selected = [];          // Charleston / discard selection
  var pendingHumanClaims = null;
  var pendingAIClaims = null;
  var timers = [];

  function later(fn, ms) {
    var id = setTimeout(function () {
      timers = timers.filter(function (t) { return t !== id; });
      fn();
    }, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ============================================================
     Start
     ============================================================ */
  function newGame() {
    clearTimers();
    G = AmGame.create({ difficulty: Store.settings().difficulty, dealer: Math.floor(Math.random() * 4) });
    selected = [];
    pendingHumanClaims = null;
    pendingAIClaims = null;
    showActions([], false);
    UI.screen('am', { immersive: true });
    render();
    later(advanceCharleston, 550);
  }

  function quit() {
    UI.modal({
      title: 'Leave the table?',
      body: '<p>This hand will be abandoned.</p>',
      actions: [
        { label: 'Keep playing' },
        {
          label: 'Leave', cls: 'danger', onClick: function () {
            clearTimers(); G = null; UI.screen('home'); App.refreshHome();
          }
        }
      ]
    });
  }

  /* ============================================================
     Charleston
     ============================================================ */
  function advanceCharleston() {
    if (!G || G.over) return;
    if (G.charlestonStep === 3 && !G.secondAsked) return askSecond();
    if (G.charlestonStep >= 6) return askCourtesy();
    promptPass(AmGame.CHARLESTON[G.charlestonStep]);
  }

  function promptPass(info) {
    selected = [];
    G.passInfo = info;
    render();
    setBanner('Charleston · pass 3 ' + info.name.toUpperCase(), 'Jokers can never be passed.');
    showActions([{
      label: 'Pass 3 ' + info.name, cls: 'call', id: 'pass-btn',
      disabled: true,
      onClick: doPass
    }], true);
  }

  function doPass() {
    if (selected.length !== 3) return;
    var picks = [selected.slice()];
    for (var p = 1; p < 4; p++) picks.push(AmGame.aiCharlestonPick(G, p));
    var got = AmGame.applyPass(G, picks, G.passInfo.dir);

    UI.sound('click');
    var from = (0 - G.passInfo.dir + 4) % 4;
    UI.toast('Received from <strong>' + G.players[from].name + '</strong>');

    selected = [];
    G.charlestonStep++;
    G.passInfo = null;
    showActions([], false);
    render();
    later(advanceCharleston, 700);
  }

  function askSecond() {
    G.secondAsked = true;
    var aiYes = [1, 2, 3].filter(function (p) { return AmGame.aiWantsSecond(G, p); });
    if (aiYes.length < 3) {
      var stopper = [1, 2, 3].filter(function (p) { return aiYes.indexOf(p) < 0; })[0];
      UI.toast('<strong>' + G.players[stopper].name + '</strong> stopped the second Charleston');
      G.charlestonStep = 6;
      return later(advanceCharleston, 900);
    }
    var r = AmGame.coachFor(G, 0);
    UI.modal({
      title: 'Second Charleston?',
      body: '<p>All three opponents want to keep passing. You can stop it here if your hand is coming together.</p>' +
        '<p class="muted small">Your best hand is currently <strong>' + r.missing +
        '</strong> tile' + (r.missing === 1 ? '' : 's') + ' away.</p>',
      dismissable: false,
      actions: [
        {
          label: 'Stop here', onClick: function () {
            G.charlestonStep = 6; later(advanceCharleston, 300);
          }
        },
        {
          label: 'Keep passing', cls: 'primary', onClick: function () {
            later(advanceCharleston, 300);
          }
        }
      ]
    });
  }

  function askCourtesy() {
    if (G.courtesy) return startPlay();
    G.courtesy = true;
    var theirs = AmGame.aiCourtesyCount(G, 2);
    UI.modal({
      title: 'Courtesy pass',
      body: '<p>One last optional swap with the player across the table — ' +
        '<strong>' + G.players[2].name + '</strong>. You each name a number and the ' +
        'smaller one wins.</p>' +
        '<p class="muted small">' + G.players[2].name + ' has not said yet.</p>',
      dismissable: false,
      actions: [0, 1, 2, 3].map(function (n) {
        return {
          label: String(n), cls: n === 0 ? '' : 'primary',
          onClick: function () { runCourtesy(Math.min(n, theirs)); }
        };
      })
    });
  }

  function runCourtesy(n) {
    if (n <= 0) {
      UI.toast('No courtesy pass');
      return later(startPlay, 500);
    }
    selected = [];
    G.courtesyN = n;
    render();
    setBanner('Courtesy pass · choose ' + n, 'Swapping with ' + G.players[2].name + '.');
    showActions([{
      label: 'Swap ' + n, cls: 'call', id: 'pass-btn', disabled: true,
      onClick: function () {
        if (selected.length !== n) return;
        var mine = selected.slice();
        var theirsPick = AmGame.aiCharlestonPick(G, 2).slice(0, n);
        mine.forEach(function (t) { removeFrom(G.players[0].hand, t); });
        theirsPick.forEach(function (t) { removeFrom(G.players[2].hand, t); });
        mine.forEach(function (t) { G.players[2].hand.push(t); });
        theirsPick.forEach(function (t) { G.players[0].hand.push(t); });
        AmGame.sortHand(G.players[0].hand);
        AmGame.sortHand(G.players[2].hand);
        selected = [];
        G.courtesyN = 0;
        UI.sound('click');
        showActions([], false);
        render();
        later(startPlay, 600);
      }
    }], true);
  }

  function removeFrom(arr, t) {
    var i = arr.indexOf(t);
    if (i >= 0) arr.splice(i, 1);
  }

  function startPlay() {
    G.phase = 'discard';
    G.turn = G.dealer;
    setBanner('', '');
    render();
    if (G.dealer === 0) humanTurn();
    else later(aiAct, SPEED);
  }

  /* ============================================================
     Main loop
     ============================================================ */
  function step() {
    if (!G || G.over) return;
    var pi = G.turn;
    if (G.phase === 'draw') {
      if (AmGame.wallLeft(G) <= 0) return wallGame();
      AmGame.draw(G, pi);
      G.phase = 'discard';
      if (pi === 0) UI.sound('draw');
      render();
    }
    if (G.phase !== 'discard') return;
    if (pi === 0) humanTurn();
    else later(aiAct, SPEED);
  }

  function aiAct() {
    if (!G || G.over) return;
    var pi = G.turn;
    if (AmGame.canWinNow(G, pi)) {
      return finishWin(pi, G.players[pi].drawnTile, true, null);
    }
    var red = AmGame.aiRedemption(G, pi);
    if (red) {
      AmGame.applyRedemption(G, pi, red);
      say(pi, 'Joker!');
      render();
    }
    var t = AmGame.aiDiscard(G, pi);
    if (t === undefined) return wallGame();
    AmGame.discard(G, pi, t);
    G.phase = 'resolve';
    render();
    later(afterDiscard, SPEED * 0.6);
  }

  function humanTurn() {
    selected = [];
    render();
    var acts = [];
    if (AmGame.canWinNow(G, 0)) {
      acts.push({
        label: '🏆 Mah Jongg!', cls: 'win',
        onClick: function () { finishWin(0, G.players[0].drawnTile, true, null); }
      });
    }
    var reds = AmGame.redemptionOptions(G, 0);
    if (reds.length) {
      acts.push({
        label: 'Swap for Joker', cls: 'call', onClick: function () { chooseRedemption(reds); }
      });
    }
    showActions(acts, acts.length > 0);
  }

  function chooseRedemption(reds) {
    UI.modal({
      title: 'Redeem a joker',
      body: '<p>Give the real tile, take the joker off their exposure. Jokers are the ' +
        'most valuable tiles on the table.</p>',
      actions: reds.slice(0, 3).map(function (r) {
        return {
          label: T.short(r.tile) + ' → ' + r.ownerName, cls: 'primary',
          onClick: function () {
            AmGame.applyRedemption(G, 0, r);
            UI.sound('good');
            UI.toast('Took a joker from <strong>' + r.ownerName + '</strong>');
            humanTurn();
          }
        };
      }).concat([{ label: 'Cancel' }])
    });
  }

  function humanDiscard(tile) {
    if (!G || G.over || G.turn !== 0 || G.phase !== 'discard') return;
    if (tile === T.JOKER) {
      UI.toast('A discarded joker is dead — nobody may claim it');
    }
    AmGame.discard(G, 0, tile);
    // Block re-entry: without this a fast double-tap discards twice before
    // afterDiscard resolves, and the second resolution finds no lastDiscard.
    G.phase = 'resolve';
    selected = [];
    showActions([], false);
    UI.sound('click');
    render();
    later(afterDiscard, SPEED * 0.5);
  }

  function afterDiscard() {
    if (!G || G.over || !G.lastDiscard) return;
    var claims = AmGame.availableClaims(G);
    if (!claims.length) return passTurn();

    var human = claims.filter(function (c) { return c.player === 0; });
    var ai = [];
    [1, 2, 3].forEach(function (p) {
      var d = AmGame.aiClaimDecision(G, p, claims);
      if (d) ai.push(d);
    });
    if (human.length) {
      pendingHumanClaims = human;
      pendingAIClaims = ai;
      return showClaimBar(human);
    }
    later(function () { applyBest(ai); }, SPEED * 0.6);
  }

  function bestClaim(list) {
    if (!list.length || !G.lastDiscard) return null;
    var from = G.lastDiscard.from;
    return list.slice().sort(function (a, b) {
      if ((a.type === 'mahjong') !== (b.type === 'mahjong')) return a.type === 'mahjong' ? -1 : 1;
      return ((a.player - from + 4) % 4) - ((b.player - from + 4) % 4);
    })[0];
  }

  function applyBest(list) {
    if (!G || G.over) return;
    var c = bestClaim(list);
    if (!c) return passTurn();
    if (c.type === 'mahjong') return finishWin(c.player, c.tile, false, G.lastDiscard.from);

    AmGame.applyClaim(G, c);
    say(c.player, 'Call!');
    UI.sound('click');
    G.phase = 'discard';
    render();
    if (c.player === 0) humanTurn();
    else later(aiAct, SPEED);
  }

  function passTurn() {
    if (!G || G.over || !G.lastDiscard) return;
    G.turn = (G.lastDiscard.from + 1) % 4;
    G.phase = 'draw';
    render();
    later(step, SPEED * 0.35);
  }

  /* ============================================================
     Endings
     ============================================================ */
  function wallGame() {
    AmGame.endWall(G);
    render();
    var mine = G.result.closest[0];
    var body = el('div', 'finish');
    body.innerHTML = '<div class="finish-ico">🧱</div>' +
      '<p class="finish-sub">Wall game — nobody completed a hand.</p>' +
      '<p class="muted small">You finished <strong>' + mine + '</strong> tile' +
      (mine === 1 ? '' : 's') + ' short.</p>';
    Store.data.games.played++; Store.save();
    Store.addXP(mine <= 1 ? 12 : 5);
    UI.sound('lose');
    endModal('Wall game', body);
  }

  function finishWin(pi, tile, selfDraw, from) {
    var res = AmGame.declareWin(G, pi, tile, selfDraw, from);
    render();
    var human = pi === 0;
    Store.data.games.played++;
    if (human) {
      Store.data.games.won++;
      Store.data.games.bestScore = Math.max(Store.data.games.bestScore, res.total);
      Store.award('first-win');
      Store.award('card-shark');
      if (selfDraw) Store.award('self-made');
      if (res.concealedBonus) Store.award('closed-book');
      if (res.entry && res.entry.hand.cat === 'Quints') Store.award('joker-wild');
      Store.addXP(45 + Math.min(60, Math.round(res.total / 5)));
      UI.sound('win');
      UI.confetti();
    } else {
      Store.addXP(8);
      UI.sound('lose');
    }
    Store.save();

    var winner = G.players[pi];
    var head = '<div class="finish-ico">' + (human ? '🏆' : '🀄') + '</div>' +
      '<p class="finish-sub">' + (human ? 'Mah Jongg! You made the hand.' :
        winner.name + ' declared Mah Jongg' +
        (selfDraw ? ' on her own draw' : ' on ' +
          (from === 0 ? '<strong>your</strong> discard' : G.players[from].name + '’s discard'))) + '</p>';

    var tiles = winner.hand.slice().sort(function (a, b) { return a - b; });
    var exp = winner.exposures.map(function (e) {
      return '<div class="win-set">' + e.tiles.map(function (t) { return T.html(t, 'xs'); }).join('') + '</div>';
    }).join('');
    var conc = tiles.length
      ? '<div class="win-set">' + tiles.map(function (t) { return T.html(t, 'xs'); }).join('') + '</div>' : '';

    var pays = res.payers.map(function (p) {
      return '<li><span>' + p.name + (p.player === from && !selfDraw ? ' (threw it)' : '') +
        '</span><b>' + p.pays + '</b></li>';
    }).join('');

    var body = el('div', 'finish');
    body.innerHTML = head +
      '<div class="win-sets">' + exp + conc + '</div>' +
      '<div class="score-card">' +
      '<div class="score-row"><span>' + (res.entry ? res.entry.hand.cat : 'Hand') +
      ' — ' + (res.entry ? res.entry.hand.label : '') + '</span><b>' + res.value + '</b></div>' +
      (res.concealedBonus ? '<div class="score-row"><span>Concealed hand</span><b>×2</b></div>' : '') +
      (selfDraw ? '<div class="score-row"><span>Self-pick — everyone pays double</span><b>×2</b></div>'
        : '<div class="score-row"><span>Thrower pays double</span><b>×2</b></div>') +
      '<ul class="score-list">' + pays + '</ul>' +
      '<div class="score-total"><span>' + (human ? 'You collect' : winner.name + ' collects') +
      '</span><b>' + res.total + '</b></div>' +
      '</div>';

    endModal(human ? 'Mah Jongg!' : 'Hand over', body);
  }

  function endModal(title, body) {
    UI.modal({
      title: title, body: body, dismissable: false,
      actions: [
        { label: 'Table', onClick: function () { render(); } },
        { label: 'Play again', cls: 'primary', onClick: function () { newGame(); } },
        {
          label: 'Home', onClick: function () {
            clearTimers(); G = null; UI.screen('home'); App.refreshHome(); UI.flushRewards();
          }
        }
      ]
    });
  }

  function say(pi, text) {
    var box = document.getElementById('am-seat-' + pi);
    if (!box) return;
    var b = el('span', 'bubble', text);
    box.appendChild(b);
    setTimeout(function () { b.remove(); }, 1400);
  }

  /* ============================================================
     Rendering
     ============================================================ */
  function render() {
    if (!G) return;
    renderHeader();
    renderSeats();
    renderRivers();
    renderCoach();
    renderHand();
    if (G.over) showActions([], false);
  }

  // `main` may already contain markup, so it is not wrapped again.
  function setBanner(main, sub) {
    var b = UI.$('#am-banner');
    b.className = 'am-banner' + (main ? ' on' : '');
    b.innerHTML = main ? '<b>' + main + '</b>' + (sub ? '<span>' + sub + '</span>' : '') : '';
  }

  function renderHeader() {
    UI.$('#am-wall').textContent = AmGame.wallLeft(G);
    var t = UI.$('#am-turn'), p = UI.$('#am-phase');
    if (G.over) { t.textContent = 'hand over'; p.textContent = 'Hand over'; }
    else if (G.phase === 'charleston') {
      t.textContent = 'Charleston';
      p.textContent = G.passInfo ? 'Pick 3 tiles to pass ' + G.passInfo.name
        : G.courtesyN ? 'Pick ' + G.courtesyN + ' to swap' : 'Passing tiles';
    } else if (pendingHumanClaims) { t.textContent = 'your call'; p.textContent = 'Call it, or pass'; }
    else if (G.turn === 0) { t.textContent = 'your turn'; p.textContent = 'Tap a tile twice to discard'; }
    else { t.textContent = G.players[G.turn].name + '’s turn'; p.textContent = 'Waiting…'; }
    t.classList.toggle('mine', G.turn === 0 && !G.over);
  }

  function renderSeats() {
    var wrap = UI.$('#am-seats');
    wrap.innerHTML = '';
    [1, 2, 3].forEach(function (p) {
      var pl = G.players[p];
      var box = el('div', 'seat' + (G.turn === p && !G.over ? ' active' : ''));
      box.id = 'am-seat-' + p;
      var exps = pl.exposures.map(function (e) {
        return '<span class="meld">' + e.tiles.map(function (t) { return T.html(t, 'xs'); }).join('') + '</span>';
      }).join('');
      box.innerHTML =
        '<div class="seat-top"><span class="seat-name">' + pl.name + '</span>' +
        '<span class="seat-wind">' + pl.hand.length + '</span></div>' +
        '<div class="seat-hand">' + repeat(T.backHTML('xs'), Math.min(pl.hand.length, 10)) + '</div>' +
        (exps ? '<div class="seat-melds">' + exps + '</div>' : '');
      wrap.appendChild(box);
    });
  }

  function repeat(s, n) { var o = ''; for (var i = 0; i < n; i++) o += s; return o; }

  function renderRivers() {
    [[1, 2], [3, 0]].forEach(function (row, ri) {
      var wrap = UI.$(ri === 0 ? '#am-rivers-top' : '#am-rivers-bot');
      wrap.innerHTML = '';
      row.forEach(function (p) {
        var pl = G.players[p];
        var box = el('div', 'river r' + p + (G.turn === p && !G.over ? ' active' : ''));
        var last = G.lastDiscard && G.lastDiscard.from === p ? pl.discards.length - 1 : -1;
        box.innerHTML = '<div class="river-l">' + (p === 0 ? 'You' : pl.name) +
          '<span class="river-n">' + pl.discards.length + '</span></div>' +
          '<div class="river-t">' + pl.discards.map(function (t, i) {
            return T.html(t, 'xs' + (i === last ? ' hot' : ''));
          }).join('') + '</div>';
        wrap.appendChild(box);
      });
    });
  }

  function renderCoach() {
    var bar = UI.$('#am-coach');
    if (G.over) { bar.className = 'coach'; bar.innerHTML = ''; return; }
    var info = AmGame.coachFor(G, 0);
    bar.className = 'coach on';

    var lead = info.top[0];
    var main = info.missing === 0
      ? '<b>Complete — declare Mah Jongg!</b>'
      : '<b>' + info.missing + '</b> tile' + (info.missing === 1 ? '' : 's') + ' from';

    var target = lead
      ? '<button type="button" class="target" id="am-target">' +
      '<span class="target-cat">' + lead.hand.cat + '</span>' +
      '<span class="target-lab">' + lead.hand.label + '</span></button>'
      : '';

    var extra = '';
    if (Store.settings().coach && info.best && G.turn === 0 && G.phase === 'discard') {
      extra = '<div class="coach-tiles"><span>throw</span>' + T.html(info.best.tile, 'xs') + '</div>';
    }
    bar.innerHTML = '<div class="coach-main">' + main + '</div>' + target + extra;
    var btn = UI.$('#am-target');
    if (btn) btn.addEventListener('click', openCard);
  }

  /** The card browser — the heart of the American game. */
  function openCard() {
    var c = AmGame.effectiveCounts(G.players[0]);
    var ranked = AmCard.rank(c, null);
    var byId = {};
    ranked.forEach(function (r) { byId[r.hand.id] = r; });

    var wrap = el('div', 'cardview');
    wrap.innerHTML = '<p class="muted small">Your distance to every hand, closest first. ' +
      'Tap nothing — this is just for reading. Jokers fill groups of three or more, never pairs or singles.</p>';

    ranked.forEach(function (r, i) {
      var h = r.hand;
      var row = el('div', 'cardrow' + (i === 0 ? ' lead' : '') + (r.missing === 0 ? ' won' : ''));
      var d = r.detail;
      var tiles = '';
      h.g.forEach(function (grp) {
        var t = AmCard.resolve(grp[1], d.assign, d.n);
        if (t < 0) return;
        tiles += '<span class="cardgrp">' +
          repeat(T.html(t, 'xs'), Math.min(grp[0], 5)) + '</span>';
      });
      row.innerHTML =
        '<div class="cardrow-h"><span class="cardrow-cat">' + h.cat + '</span>' +
        '<span class="cardrow-val">' + h.value + (h.concealed ? ' · C' : '') + '</span>' +
        '<span class="cardrow-d">' + (r.missing === 0 ? 'WIN' : r.missing + ' away') + '</span></div>' +
        '<div class="cardrow-l">' + h.label + '</div>' +
        '<div class="cardrow-t">' + tiles + '</div>' +
        (h.note ? '<div class="cardrow-n">' + h.note + '</div>' : '');
      wrap.appendChild(row);
    });

    UI.modal({
      title: 'The Card',
      body: wrap,
      actions: [{ label: 'Close', cls: 'primary' }]
    });
  }

  function renderHand() {
    var wrap = UI.$('#am-hand');
    wrap.innerHTML = '';
    var pl = G.players[0];

    if (pl.exposures.length) {
      var mw = el('div', 'my-melds');
      pl.exposures.forEach(function (e) {
        var mm = el('span', 'meld');
        mm.innerHTML = e.tiles.map(function (t) { return T.html(t, 'sm'); }).join('');
        mw.appendChild(mm);
      });
      wrap.appendChild(mw);
    }

    var charleston = G.phase === 'charleston';
    var need = G.courtesyN || 3;
    var myTurn = !charleston && G.turn === 0 && G.phase === 'discard' && !G.over && !pendingHumanClaims;

    var hand = pl.hand.slice().sort(function (a, b) { return a - b; });
    var drawn = pl.drawnTile;
    if (!charleston && drawn !== null && drawn !== undefined) {
      var at = hand.indexOf(drawn);
      if (at >= 0) hand.splice(at, 1);
    } else drawn = null;

    var suggested = null;
    if (Store.settings().coach && myTurn) {
      var info = AmGame.coachFor(G, 0);
      if (info.best) suggested = info.best.tile;
    }

    var row = el('div', 'hand');
    var counted = {};

    function addTile(t, isDrawn) {
      var n = T.el(t);
      var seq = (counted[t] = (counted[t] || 0) + 1);
      if (isDrawn) n.classList.add('drawn');
      if (suggested === t && seq === 1) n.classList.add('hint');

      if (charleston) {
        var locked = t === T.JOKER;
        if (locked) n.classList.add('locked');
        var pos = selected.indexOf(t);
        // Mark exactly as many copies selected as the player chose.
        var chosenCount = selected.filter(function (x) { return x === t; }).length;
        if (seq <= chosenCount) n.classList.add('sel');
        n.addEventListener('click', function () {
          if (locked) { UI.toast('Jokers can never be passed'); UI.sound('bad'); return; }
          var ci = selected.indexOf(t);
          var have = selected.filter(function (x) { return x === t; }).length;
          var own = pl.hand.filter(function (x) { return x === t; }).length;
          if (have >= own || selected.length >= need) {
            if (ci >= 0) { selected.splice(ci, 1); UI.sound('tap'); }
            else { UI.toast('Pick ' + need); return; }
          } else {
            selected.push(t); UI.sound('tap');
          }
          render();
          var b = UI.$('#pass-btn');
          if (b) b.disabled = selected.length !== need;
        });
      } else {
        if (!myTurn) n.classList.add('idle');
        n.addEventListener('click', function () {
          if (!myTurn) return;
          if (selected[0] === t) { humanDiscard(t); return; }
          selected = [t];
          UI.sound('tap');
          render();
        });
        if (selected[0] === t && seq === 1) n.classList.add('sel');
      }
      row.appendChild(n);
    }

    hand.forEach(function (t) { addTile(t, false); });
    if (drawn !== null) {
      row.appendChild(el('span', 'hand-gap'));
      addTile(drawn, true);
    }
    wrap.appendChild(row);

    var b = UI.$('#pass-btn');
    if (b) b.disabled = selected.length !== need;
  }

  /* ---------------- actions ---------------- */
  function showActions(acts, urgent) {
    var bar = UI.$('#am-actions');
    bar.innerHTML = '';
    bar.className = 'actions' + (acts.length ? ' on' : '') + (urgent ? ' urgent' : '');
    acts.forEach(function (a) {
      var b = el('button', 'act ' + (a.cls || ''), a.label);
      b.type = 'button';
      if (a.id) b.id = a.id;
      if (a.disabled) b.disabled = true;
      b.addEventListener('click', a.onClick);
      bar.appendChild(b);
    });
  }

  function showClaimBar(human) {
    var tile = G.lastDiscard.tile;
    var fromName = G.players[G.lastDiscard.from].name;
    var acts = [];
    var seenSizes = {};

    human.forEach(function (c) {
      if (c.type === 'mahjong') {
        acts.push({
          label: '🏆 Mah Jongg', cls: 'win', onClick: function () {
            pendingHumanClaims = null;
            finishWin(0, tile, false, G.lastDiscard.from);
          }
        });
      } else if (!seenSizes[c.size]) {
        seenSizes[c.size] = true;
        var kind = c.size === 3 ? 'Pung' : c.size === 4 ? 'Kong' : 'Quint';
        acts.push({
          label: 'Call · ' + kind + (c.useJokers ? ' (+' + c.useJokers + 'J)' : ''),
          cls: 'call', onClick: function () { takeClaim(c); }
        });
      }
    });
    acts.push({
      label: 'Pass', cls: 'pass', onClick: function () {
        var ai = pendingAIClaims;
        pendingHumanClaims = null; pendingAIClaims = null;
        showActions([], false);
        render();
        later(function () { applyBest(ai || []); }, 220);
      }
    });

    UI.sound('draw');
    UI.haptic(25);
    UI.toast(fromName + ' discarded <strong>' + T.name(tile) + '</strong>');
    showActions(acts, true);
    render();
  }

  function takeClaim(c) {
    var ai = pendingAIClaims || [];
    pendingHumanClaims = null; pendingAIClaims = null;
    showActions([], false);
    applyBest(ai.concat([c]));
  }

  global.AmPlay = {
    newGame: newGame, quit: quit, openCard: openCard,
    active: function () { return !!G; },
    state: function () { return G; }
  };
})(window);
