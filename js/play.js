/* ============================================================
   play.js — the four-player table screen
   ============================================================ */
(function (global) {
  'use strict';

  var el = UI.el;
  var G = null;
  var SPEED = 620;
  var selected = null;
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
     Start / stop
     ============================================================ */
  function newGame() {
    clearTimers();
    G = Game.create({ difficulty: Store.settings().difficulty, dealer: Math.floor(Math.random() * 4) });
    selected = null;
    pendingHumanClaims = null;
    pendingAIClaims = null;
    // Wipe any buttons left over from the previous hand — they stay live
    // otherwise, and a stale "Declare Win" is clickable on a fresh deal.
    showActions([], false);
    UI.screen('play', { immersive: true });
    render();
    later(step, 500);
  }

  function quit() {
    UI.modal({
      title: 'Leave the table?',
      body: '<p>This hand will be abandoned.</p>',
      actions: [
        { label: 'Keep playing' },
        {
          label: 'Leave', cls: 'danger', onClick: function () {
            clearTimers(); G = null; UI.screen('home');
          }
        }
      ]
    });
  }

  /* ============================================================
     Engine loop
     ============================================================ */
  function step() {
    if (!G || G.over) return;
    var pi = G.turn;

    if (G.phase === 'draw') {
      if (Game.wallLeft(G) <= 0) return exhaustiveDraw();
      Game.draw(G, pi);
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
    var pl = G.players[pi];

    if (Game.canWinNow(G, pi)) {
      return finishWin(pi, pl.drawnTile, true, null);
    }
    var kong = Game.aiSelfKong(G, pi);
    if (kong) {
      Game.applySelfKong(G, pi, kong);
      say(pi, 'Kong');
      render();
      return later(aiAct, SPEED);
    }
    var t = Game.aiDiscard(G, pi);
    Game.discard(G, pi, t);
    render();
    later(afterDiscard, SPEED * 0.6);
  }

  function humanTurn() {
    render();
    var pl = G.players[0];
    if (Game.canWinNow(G, 0)) {
      showActions([{ label: '🏆 Declare Win', cls: 'win', onClick: function () { finishWin(0, pl.drawnTile, true, null); } }], true);
    } else {
      var kongs = Game.selfKongOptions(G, 0);
      var acts = [];
      kongs.forEach(function (k) {
        acts.push({
          label: 'Kong ' + T.short(k.tile), cls: 'call', onClick: function () {
            Game.applySelfKong(G, 0, k);
            UI.sound('click');
            humanTurn();
          }
        });
      });
      showActions(acts, false);
    }
  }

  function humanDiscard(tile) {
    if (!G || G.over || G.turn !== 0 || G.phase !== 'discard') return;
    Game.discard(G, 0, tile);
    selected = null;
    showActions([], false);   // a leftover Kong button must not survive the turn
    UI.sound('click');
    render();
    later(afterDiscard, SPEED * 0.5);
  }

  function afterDiscard() {
    if (!G || G.over) return;
    var claims = Game.availableClaims(G);
    if (!claims.length) return passTurn();

    var human = claims.filter(function (c) { return c.player === 0; });
    var ai = [];
    [1, 2, 3].forEach(function (p) {
      var d = Game.aiClaimDecision(G, p, claims);
      if (d) ai.push(d);
    });

    if (human.length) {
      pendingHumanClaims = human;
      pendingAIClaims = ai;
      showClaimBar(human);
      return;
    }
    later(function () { applyBest(ai); }, SPEED * 0.6);
  }

  var PRIORITY = { win: 0, kong: 1, pung: 2, chow: 3 };

  function bestClaim(list) {
    if (!list.length) return null;
    var from = G.lastDiscard.from;
    return list.slice().sort(function (a, b) {
      if (PRIORITY[a.type] !== PRIORITY[b.type]) return PRIORITY[a.type] - PRIORITY[b.type];
      // Closest seat after the discarder wins the tie.
      var da = (a.player - from + 4) % 4, db = (b.player - from + 4) % 4;
      return da - db;
    })[0];
  }

  function applyBest(list) {
    if (!G || G.over) return;
    var c = bestClaim(list);
    if (!c) return passTurn();

    if (c.type === 'win') {
      return finishWin(c.player, c.tile, false, G.lastDiscard.from);
    }
    var pl = Game.applyClaim(G, c);
    say(c.player, c.type === 'chow' ? 'Chow' : c.type === 'kong' ? 'Kong' : 'Pung');
    UI.sound('click');
    G.phase = 'discard';
    render();

    if (c.type === 'kong') {
      Game.drawReplacement(G, c.player);
      render();
    }
    if (c.player === 0) humanTurn();
    else later(aiAct, SPEED);
  }

  function passTurn() {
    if (!G || G.over) return;
    G.turn = (G.lastDiscard.from + 1) % 4;
    G.phase = 'draw';
    render();
    later(step, SPEED * 0.35);
  }

  /* ============================================================
     Endings
     ============================================================ */
  function exhaustiveDraw() {
    Game.endDraw(G);
    render();
    var t = G.result.tenpai;
    var body = el('div', 'finish');
    body.innerHTML = '<div class="finish-ico">🧱</div>' +
      '<p class="finish-sub">The wall ran out. Nobody wins.</p>' +
      '<p class="muted small">' + (t[0] ? 'You were <strong>ready</strong> — well played.' :
        'You were not ready when it ended.') + '</p>';
    Store.data.games.played++; Store.save();
    Store.addXP(t[0] ? 12 : 5);
    UI.sound('lose');
    endModal('Draw', body);
  }

  function finishWin(pi, tile, selfDraw, from) {
    var res = Game.declareWin(G, pi, tile, selfDraw, from);
    render();
    var human = pi === 0;
    Store.data.games.played++;
    if (human) {
      Store.data.games.won++;
      Store.data.games.bestScore = Math.max(Store.data.games.bestScore, res.score.total);
      Store.award('first-win');
      if (selfDraw) Store.award('self-made');
      if (G.players[0].concealed) Store.award('closed-book');
      if (res.score.lines.some(function (l) { return /Flush/.test(l.label); })) Store.award('purist');
      if (res.score.total >= 500) Store.award('big-hand');
      Store.addXP(40 + Math.min(60, Math.round(res.score.total / 10)));
      UI.sound('win');
      UI.confetti();
    } else {
      Store.addXP(8);
      UI.sound('lose');
    }
    Store.save();

    var body = el('div', 'finish');
    var head = '<div class="finish-ico">' + (human ? '🏆' : '🀄') + '</div>' +
      '<p class="finish-sub">' + (human ? 'You won the hand!' :
        G.players[pi].name + ' won' + (selfDraw ? ' by self-draw' : ' on ' +
          (from === 0 ? '<strong>your</strong> discard' : G.players[from].name + '’s discard'))) + '</p>';

    var sets = '<div class="win-sets">' + res.sets.map(function (s) {
      return '<div class="win-set">' + s.tiles.map(function (t) { return T.html(t, 'xs'); }).join('') + '</div>';
    }).join('') + '</div>';

    var lines = res.score.lines.map(function (l) {
      return '<li><span>' + l.label + '</span><b>×' + Math.pow(2, l.fan) + '</b></li>';
    }).join('');

    body.innerHTML = head + sets +
      '<div class="score-card">' +
      '<div class="score-row"><span>Base points</span><b>' + res.score.base + '</b></div>' +
      (lines ? '<ul class="score-list">' + lines + '</ul>' : '<p class="muted small">No bonus patterns — a plain hand.</p>') +
      '<div class="score-total"><span>Total</span><b>' + res.score.total + '</b></div>' +
      '</div>';

    endModal(human ? 'Mahjong!' : 'Hand over', body);
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

  /* ============================================================
     Speech bubbles
     ============================================================ */
  function say(pi, text) {
    var box = document.getElementById('seat-' + pi);
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

  var WIND_GLYPH = ['東', '南', '西', '北'];

  function renderHeader() {
    UI.$('#play-wall').textContent = Game.wallLeft(G);
    UI.$('#play-round').textContent = R.WIND_NAMES[G.roundWind] + ' round';
    UI.$('#play-round-g').textContent = WIND_GLYPH[G.roundWind];
    UI.$('#play-seat').textContent = 'You: ' + R.WIND_NAMES[G.players[0].seat] +
      (G.players[0].seat === 0 ? ' (dealer)' : '');

    var turnEl = UI.$('#play-turn');
    var phaseEl = UI.$('#play-phase');
    if (G.over) {
      turnEl.textContent = 'hand over';
      phaseEl.textContent = 'Hand over';
    } else if (pendingHumanClaims) {
      turnEl.textContent = 'your call';
      phaseEl.textContent = 'Claim it, or pass';
    } else if (G.turn === 0) {
      turnEl.textContent = 'your turn';
      phaseEl.textContent = 'Tap a tile, then tap again to discard';
    } else {
      turnEl.textContent = G.players[G.turn].name + '’s turn';
      phaseEl.textContent = 'Waiting for ' + G.players[G.turn].name + '…';
    }
    turnEl.classList.toggle('mine', G.turn === 0 && !G.over);
  }

  function renderSeats() {
    var wrap = UI.$('#play-seats');
    wrap.innerHTML = '';
    [1, 2, 3].forEach(function (p) {
      var pl = G.players[p];
      var box = el('div', 'seat' + (G.turn === p && !G.over ? ' active' : ''));
      box.id = 'seat-' + p;
      var melds = pl.melds.map(function (m) {
        return '<span class="meld">' + m.tiles.map(function (t, i) {
          return T.html(m.concealed && (i === 0 || i === 3) && m.type === 'kong' ? t : t, 'xs' + (m.concealed && m.type === 'kong' ? ' hidden' : ''));
        }).join('') + '</span>';
      }).join('');
      box.innerHTML =
        '<div class="seat-top"><span class="seat-name">' + pl.name + '</span>' +
        '<span class="seat-wind">' + R.WIND_NAMES[pl.seat][0] + '</span></div>' +
        '<div class="seat-hand">' + repeat(T.backHTML('xs'), pl.hand.length) + '</div>' +
        (melds ? '<div class="seat-melds">' + melds + '</div>' : '');
      wrap.appendChild(box);
    });
  }

  function repeat(s, n) { var o = ''; for (var i = 0; i < n; i++) o += s; return o; }

  // Top row: the two players furthest from you. Bottom row: your upstream
  // neighbour (the only one you may chow from) and yourself.
  var RIVER_ROWS = [[1, 2], [3, 0]];

  function renderRivers() {
    RIVER_ROWS.forEach(function (row, ri) {
      var wrap = UI.$(ri === 0 ? '#rivers-top' : '#rivers-bot');
      wrap.innerHTML = '';
      row.forEach(function (p) {
        var pl = G.players[p];
        var box = el('div', 'river r' + p + (G.turn === p && !G.over ? ' active' : ''));
        var last = G.lastDiscard && G.lastDiscard.from === p ? pl.discards.length - 1 : -1;
        box.innerHTML = '<div class="river-l">' + (p === 0 ? 'You' : pl.name) +
          (p === 3 ? '<span class="chow-tag">chow ok</span>' : '') +
          '<span class="river-n">' + pl.discards.length + '</span></div>' +
          '<div class="river-t">' + pl.discards.map(function (t, i) {
            return T.html(t, 'xs' + (i === last ? ' hot' : ''));
          }).join('') + '</div>';
        wrap.appendChild(box);
      });
    });
  }

  function renderCoach() {
    var bar = UI.$('#play-coach');
    if (!Store.settings().coach || G.over) { bar.className = 'coach'; bar.innerHTML = ''; return; }
    var pl = G.players[0];
    var info = Game.coachFor(G, 0);
    bar.className = 'coach on';

    var txt, extra = '';
    if (info.shanten < 0) {
      txt = '<b>Complete hand — declare your win!</b>';
    } else if (info.shanten === 0) {
      var waits = info.waits && info.waits.length ? info.waits :
        R.winningTiles(Game.handCounts(pl), pl.melds.length);
      txt = '<b>Ready to win</b>';
      if (waits && waits.length) {
        extra = '<div class="coach-tiles"><span>waiting on</span>' +
          waits.map(function (t) { return T.html(t, 'xs'); }).join('') + '</div>';
      }
    } else {
      txt = '<b>' + info.shanten + '</b> tile' + (info.shanten === 1 ? '' : 's') + ' from ready';
    }

    if (info.best && G.turn === 0 && G.phase === 'discard') {
      extra += '<div class="coach-tiles"><span>suggested</span>' + T.html(info.best.tile, 'xs') +
        '<button type="button" class="why-btn" id="why-btn">why?</button></div>';
    }

    bar.innerHTML = '<div class="coach-main">' + txt + '</div>' + extra;
    var why = UI.$('#why-btn');
    if (why) why.addEventListener('click', explainDiscard);
  }

  function explainDiscard() {
    var info = Game.coachFor(G, 0);
    if (!info.rated) return;
    var rows = info.rated.slice(0, 5).map(function (r, i) {
      return '<li class="' + (i === 0 ? 'top' : '') + '">' + T.html(r.tile, 'xs') +
        '<span class="ex-t">' + (r.shanten <= 0 ? (r.shanten < 0 ? 'wins' : 'ready') : r.shanten + ' away') + '</span>' +
        '<b>' + r.ukeire + '</b><span class="ex-u">outs</span></li>';
    }).join('');
    UI.modal({
      title: 'Discard options',
      body: '<p class="muted small">“Outs” counts the tiles still unseen that would improve your hand. More outs, more chances.</p>' +
        '<ul class="explain">' + rows + '</ul>',
      actions: [{ label: 'Got it', cls: 'primary' }]
    });
  }

  function renderHand() {
    var wrap = UI.$('#play-hand');
    wrap.innerHTML = '';
    var pl = G.players[0];

    if (pl.melds.length) {
      var mw = el('div', 'my-melds');
      pl.melds.forEach(function (m) {
        var mm = el('span', 'meld');
        mm.innerHTML = m.tiles.map(function (t) { return T.html(t, 'sm'); }).join('');
        mw.appendChild(mm);
      });
      wrap.appendChild(mw);
    }

    var hand = pl.hand.slice().sort(function (a, b) { return a - b; });
    var drawn = pl.drawnTile;
    if (drawn !== null && drawn !== undefined) {
      var at = hand.indexOf(drawn);
      if (at >= 0) hand.splice(at, 1);
    } else drawn = null;

    var suggested = null;
    if (Store.settings().coach && G.turn === 0 && G.phase === 'discard' && !G.over) {
      var info = Game.coachFor(G, 0);
      if (info.best) suggested = info.best.tile;
    }

    var row = el('div', 'hand');
    var myTurn = G.turn === 0 && G.phase === 'discard' && !G.over && !pendingHumanClaims;

    function addTile(t, isDrawn) {
      var n = T.el(t);
      if (isDrawn) n.classList.add('drawn');
      if (selected === t) n.classList.add('sel');
      if (suggested === t) n.classList.add('hint');
      if (!myTurn) n.classList.add('idle');
      n.addEventListener('click', function () {
        if (!myTurn) return;
        if (selected === t) { humanDiscard(t); return; }
        selected = t;
        UI.sound('tap');
        render();
        // The raised tile plus the header hint say this already — a toast here
        // would only cover the hand it is describing.
      });
      row.appendChild(n);
    }

    hand.forEach(function (t) { addTile(t, false); });
    if (drawn !== null) {
      row.appendChild(el('span', 'hand-gap'));
      addTile(drawn, true);
    }
    wrap.appendChild(row);
  }

  /* ---------------- action bar ---------------- */
  function showActions(acts, urgent) {
    var bar = UI.$('#play-actions');
    bar.innerHTML = '';
    bar.className = 'actions' + (acts.length ? ' on' : '') + (urgent ? ' urgent' : '');
    acts.forEach(function (a) {
      var b = el('button', 'act ' + (a.cls || ''), a.label);
      b.type = 'button';
      b.addEventListener('click', a.onClick);
      bar.appendChild(b);
    });
  }

  function showClaimBar(human) {
    var tile = G.lastDiscard.tile;
    var fromName = G.players[G.lastDiscard.from].name;
    var acts = [];
    var seen = {};

    human.forEach(function (c) {
      if (c.type === 'win') {
        acts.push({
          label: '🏆 Win', cls: 'win', onClick: function () {
            pendingHumanClaims = null;
            finishWin(0, tile, false, G.lastDiscard.from);
          }
        });
      } else if (c.type === 'kong' && !seen.kong) {
        seen.kong = true;
        acts.push({ label: 'Kong', cls: 'call', onClick: function () { takeClaim(c); } });
      } else if (c.type === 'pung' && !seen.pung) {
        seen.pung = true;
        acts.push({ label: 'Pung', cls: 'call', onClick: function () { takeClaim(c); } });
      } else if (c.type === 'chow') {
        var lbl = 'Chow ' + c.with.map(T.short).join('+');
        acts.push({ label: lbl, cls: 'call', onClick: function () { takeClaim(c); } });
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
    // The human's call still has to beat any AI call of higher priority.
    applyBest(ai.concat([c]));
  }

  /* ---------------- settings on the play screen ---------------- */
  function toggleCoach() {
    var s = Store.settings();
    s.coach = !s.coach;
    Store.save();
    UI.$('#coach-toggle').classList.toggle('on', s.coach);
    UI.toast('Coach ' + (s.coach ? 'on' : 'off'));
    render();
  }

  global.Play = {
    newGame: newGame, quit: quit, toggleCoach: toggleCoach,
    active: function () { return !!G; },
    // Exposed for tools/sim.js and manual testing.
    state: function () { return G; },
    render: render
  };
})(window);
