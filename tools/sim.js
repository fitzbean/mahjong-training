/* ============================================================
   tools/sim.js — headless test harness for the rules engine.

   Loads the browser modules into a VM sandbox (no DOM needed) and runs:
     1. correctness checks on shanten / decompose / isWin / scoring
     2. a balance simulation of full games at each difficulty

   Usage:  node tools/sim.js [gamesPerDifficulty]
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

const ctx = vm.createContext({ console, JSON, Math, Date, performance });
ctx.window = ctx;
ctx.globalThis = ctx;

['tiles.js', 'rules.js', 'game.js', 'lessons.js',
  'american-card.js', 'american-game.js'].forEach(function (f) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
    vm.runInContext(src, ctx, { filename: 'js/' + f });
  });

const { T, R, Game, tt, AmCard, AmGame } = ctx;

let failures = 0;
function ok(cond, label, detail) {
  if (cond) { console.log('  ✓ ' + label); }
  else { failures++; console.log('  ✗ ' + label + (detail ? '  -> ' + detail : '')); }
}

/* ============================================================
   1. Rules correctness
   ============================================================ */
console.log('\n--- shanten ---');
[
  ['complete standard hand', '123m 456m 789m 111z 55p', 0, -1],
  ['complete all-pungs', '111m 999m 111p 999p 55z', 0, -1],
  ['seven pairs', '11m 33m 55p 77p 22s 44s 99s', 0, -1],
  ['thirteen orphans', '19m 19p 19s 12345677z', 0, -1],
  ['tenpai two-sided', '123m 456m 789m 55p 78s', 0, 0],
  ['tenpai single wait', '234p 567p 234s 456s 9m', 0, 0],
  ['one away (no pair yet)', '123m 456m 789m 5p 7p 3s 9s', 0, 1],
  // 2 sets + pair + 1 partial = 4 blocks -> 8 - 2*2 - 2 = 2
  ['two away', '123m 456m 55z 5p 7p 9p 3s 1z', 0, 2],
  // 2 sets + 1 partial, no pair -> 8 - 2*2 - 1 = 3
  ['three away', '123m 456m 5p 7p 3s 9s 2z 5z 7m', 0, 3],
  ['open hand, one meld, tenpai', '456m 789m 55p 78s', 1, 0]
].forEach(function (c) {
  const sh = R.shanten(R.counts(tt(c[1])), c[2]);
  ok(sh === c[3], c[0], 'got ' + sh + ' want ' + c[3]);
});

console.log('\n--- decompose ---');
[
  ['three chows + pung + pair', '123m 456m 789m 111z 55p', 5],
  ['duplicate chows', '234p 234p 55s 678m 999s', 5],
  ['four pungs', '111m 999m 111p 999p 55z', 5]
].forEach(function (c) {
  const d = R.decompose(R.counts(tt(c[1])), 0);
  const n = d ? d.reduce(function (s, x) { return s + x.tiles.length; }, 0) : 0;
  ok(d && d.length === c[2] && n === 14, c[0],
    d ? d.length + ' parts / ' + n + ' tiles' : 'NULL');
});
ok(R.decompose(R.counts(tt('123m 456m 789m 111z 5p 6p')), 0) === null,
  'rejects an incomplete hand');

console.log('\n--- isWin false positives ---');
(function () {
  let fp = 0;
  for (let i = 0; i < 20000; i++) {
    const w = [];
    for (let a = 0; a < 34; a++) for (let b = 0; b < 4; b++) w.push(a);
    Game.shuffle(w);
    const c = R.counts(w.slice(0, 14));
    if (R.isWin(c, 0)) {
      const d = R.decompose(c, 0);
      const good = (d && d.reduce(function (s, x) { return s + x.tiles.length; }, 0) === 14) ||
        R.isSevenPairs(c, 0) || R.isThirteenOrphans(c, 0);
      if (!good) fp++;
    }
    if (R.isWin(c, 0) !== (R.shanten(c, 0) === -1)) fp++;
  }
  ok(fp === 0, '20000 random hands: isWin agrees with shanten, no bogus wins', fp + ' bad');
})();

console.log('\n--- waits ---');
(function () {
  const c = R.counts(tt('123m 456m 789m 55p 78s'));
  const w = R.winningTiles(c, 0).map(T.short).join(',');
  ok(w === '6S,9S', 'open-ended wait finds both tiles', w);
  const c2 = R.counts(tt('234p 567p 234s 456s 9m'));
  const w2 = R.winningTiles(c2, 0).map(T.short).join(',');
  ok(w2 === '9M', 'single wait finds only the real tile', w2);
})();

console.log('\n--- scoring ---');
(function () {
  const plain = R.score(R.decompose(R.counts(tt('123m 456m 789m 111z 55p')), 0),
    { seatWind: 1, roundWind: 0, concealed: true });
  ok(plain.total > 0 && plain.total < 400, 'plain concealed hand is modest', plain.total);

  const flush = R.score(R.decompose(R.counts(tt('123p 456p 789p 111p 55p')), 0),
    { seatWind: 1, roundWind: 0, selfDraw: true, concealed: true });
  ok(flush.total > plain.total * 4, 'full flush self-draw beats a plain hand',
    flush.total + ' vs ' + plain.total);

  ok(R.score([], { seatWind: 0, roundWind: 0 }).total === 20,
    'empty decomposition cannot mint a jackpot');

  const chowy = R.score(R.decompose(R.counts(tt('123m 456m 789s 234p 55p')), 0),
    { seatWind: 1, roundWind: 0, concealed: true });
  ok(chowy.total <= plain.total, 'all-chow hand scores at or below a pung hand', chowy.total);
})();

/* ============================================================
   1b. American mahjong
   ============================================================ */
console.log('\n--- american: card integrity ---');
(function () {
  let bad = [];
  AmCard.CARD.forEach(function (h) {
    if (h.size !== 14) bad.push(h.id + ' is ' + h.size + ' tiles');
    let resolvable = false;
    const hi = h.maxOff >= 0 ? 9 - h.maxOff : 1;
    h.assigns.forEach(function (a) {
      for (let n = 1; n <= hi; n++) {
        if (h.g.every(function (g) { return AmCard.resolve(g[1], a, n) >= 0; })) resolvable = true;
      }
    });
    if (!resolvable) bad.push(h.id + ' never resolves');
  });
  ok(bad.length === 0, AmCard.CARD.length + ' hands, all exactly 14 tiles and resolvable',
    bad.join('; '));
  ok(AmCard.CATEGORIES.length >= 8, AmCard.CATEGORIES.length + ' categories');
})();

console.log('\n--- american: joker rules ---');
(function () {
  const F = T.FLOWER, J = T.JOKER;
  const m = function (r) { return T.idx('m', r); };
  const C = AmCard.counts36;

  const kong = [F, F, m(2), m(2), m(2), m(2), m(4), m(4), m(4), m(4), m(6), m(6), m(6), m(6)];
  ok(!!AmCard.isMahjong(C(kong)), 'exact hand wins');

  const withJoker = kong.slice(); withJoker[2] = J;
  ok(!!AmCard.isMahjong(C(withJoker)), 'joker completes a kong');

  const jokerInPair = kong.slice(); jokerInPair[0] = J;
  ok(!AmCard.isMahjong(C(jokerInPair)), 'joker is REFUSED by a pair');

  const singles = [m(2), m(4), m(6), m(8), T.idx('p', 2), T.idx('p', 4), T.idx('p', 6),
  T.idx('p', 8), T.idx('s', 2), T.idx('s', 4), T.idx('s', 6), T.idx('s', 8), F, F];
  ok(!!AmCard.isMahjong(C(singles)), 'all-singles hand wins with real tiles');
  const singlesJ = singles.slice(); singlesJ[0] = J;
  ok(!AmCard.isMahjong(C(singlesJ)), 'joker is REFUSED by a single');

  // Quints are impossible without jokers: only 4 of any tile exist.
  const quint = [30, 30, 30, 30, J, 28, 28, 28, 28, J, m(1), m(1), m(1), m(1)];
  ok(!!AmCard.isMahjong(C(quint)), 'quint hand wins using two jokers');

  ok(AmCard.rateDiscards(C(withJoker), null).every(function (r) { return r.tile !== J; }),
    'a joker is never offered as a discard');
})();

console.log('\n--- american: 14-tile invariant ---');
(function () {
  let bad = 0;
  for (let i = 0; i < 400; i++) {
    const w = [];
    for (let a = 0; a < 34; a++) for (let b = 0; b < 4; b++) w.push(a);
    for (let f = 0; f < 8; f++) w.push(T.FLOWER);
    for (let j = 0; j < 8; j++) w.push(T.JOKER);
    AmGame.shuffle(w);
    const c = AmCard.counts36(w.slice(0, 14));
    const r = AmCard.rank(c, null);
    if (!r.length) { bad++; continue; }
    // distance can never exceed the hand size
    if (r[0].missing < 0 || r[0].missing > 14) bad++;
    // a claimed win must really be 14 tiles
    if (AmCard.isMahjong(c, null) && r[0].missing !== 0) bad++;
  }
  ok(bad === 0, '400 random 14-tile hands rank sanely', bad + ' bad');
})();

/* ---- full American games ---- */
function playAmerican(difficulty, dealer) {
  const G = AmGame.create({ difficulty: difficulty, dealer: dealer });

  // Charleston: three passes, an optional three more, then a courtesy pass.
  for (let step = 0; step < 3; step++) {
    const picks = [0, 1, 2, 3].map(function (p) { return AmGame.aiCharlestonPick(G, p); });
    AmGame.applyPass(G, picks, AmGame.CHARLESTON[step].dir);
  }
  if ([0, 1, 2, 3].every(function (p) { return AmGame.aiWantsSecond(G, p); })) {
    for (let step = 3; step < 6; step++) {
      const picks = [0, 1, 2, 3].map(function (p) { return AmGame.aiCharlestonPick(G, p); });
      AmGame.applyPass(G, picks, AmGame.CHARLESTON[step].dir);
    }
  }

  // Sanity: everyone still holds the right number of tiles, no joker escaped.
  for (let p = 0; p < 4; p++) {
    const want = p === G.dealer ? 14 : 13;
    if (G.players[p].hand.length !== want) return { bug: 'p' + p + ' has ' + G.players[p].hand.length };
  }

  G.phase = 'discard';
  G.turn = G.dealer;
  let guard = 0, needDraw = false;

  while (guard++ < 800) {
    const pi = G.turn;
    if (needDraw) {
      if (AmGame.wallLeft(G) <= 0) { AmGame.endWall(G); return { draw: true, G: G }; }
      AmGame.draw(G, pi);
    }
    if (AmGame.canWinNow(G, pi)) {
      AmGame.declareWin(G, pi, G.players[pi].drawnTile, true, null);
      return { winner: pi, G: G };
    }
    const red = AmGame.aiRedemption(G, pi);
    if (red) AmGame.applyRedemption(G, pi, red);

    const t = AmGame.aiDiscard(G, pi);
    if (t === undefined || !AmGame.discard(G, pi, t)) return { bug: 'discard failed p' + pi };

    const claims = AmGame.availableClaims(G);
    const want = [];
    for (let p = 0; p < 4; p++) {
      if (p === G.lastDiscard.from) continue;
      const d = AmGame.aiClaimDecision(G, p, claims);
      if (d) want.push(d);
    }
    if (want.length) {
      const from = G.lastDiscard.from;
      want.sort(function (a, b) {
        if ((a.type === 'mahjong') !== (b.type === 'mahjong')) return a.type === 'mahjong' ? -1 : 1;
        return ((a.player - from + 4) % 4) - ((b.player - from + 4) % 4);
      });
      const cc = want[0];
      if (cc.type === 'mahjong') {
        AmGame.declareWin(G, cc.player, cc.tile, false, from);
        return { winner: cc.player, G: G };
      }
      AmGame.applyClaim(G, cc);
      needDraw = false;
      continue;
    }
    G.turn = (G.lastDiscard.from + 1) % 4;
    needDraw = true;
  }
  return { stuck: true, G: G };
}

console.log('\n--- american: full games ---');
(function () {
  const N = Math.max(12, Math.min(30, parseInt(process.argv[2], 10) || 20));
  const r = { win: 0, draw: 0, stuck: 0, bugs: [], leaks: 0, sizes: 0 };
  const values = [];
  for (let g = 0; g < N; g++) {
    const out = playAmerican('standard', g % 4);
    if (out.bug) { r.bugs.push(out.bug); continue; }
    if (out.stuck) { r.stuck++; }
    else if (out.draw) r.draw++;
    else { r.win++; if (out.G.result) values.push(out.G.result.total); }

    const G = out.G;
    if (G) {
      const seen = new Array(36).fill(0);
      G.players.forEach(function (pl) {
        pl.hand.forEach(function (x) { seen[x]++; });
        pl.discards.forEach(function (x) { seen[x]++; });
        pl.exposures.forEach(function (e) { e.tiles.forEach(function (x) { seen[x]++; }); });
        // hand size must stay legal all the way to the end
        const sz = AmGame.handSize(pl);
        if (!G.over && sz !== 13 && sz !== 14) r.sizes++;
      });
      for (let q = 0; q < 36; q++) {
        const cap = (q === T.FLOWER || q === T.JOKER) ? 8 : 4;
        if (seen[q] > cap) r.leaks++;
      }
    }
  }
  ok(r.bugs.length === 0, 'no engine faults across ' + N + ' games', r.bugs.slice(0, 3).join('; '));
  ok(r.leaks === 0, 'no tile duplication', r.leaks + ' leaks');
  ok(r.sizes === 0, 'hand sizes stay legal', r.sizes + ' bad');
  ok(r.stuck === 0, 'every game terminates', r.stuck + ' stuck');
  console.log('    wins ' + r.win + ' / wall games ' + r.draw +
    (values.length ? ' | median payout ' + values.sort(function (a, b) { return a - b; })[Math.floor(values.length / 2)] : ''));
})();

/* ============================================================
   2. Balance simulation
   ============================================================ */

// A "coached human": always takes the engine's best discard, and claims
// whenever the claim strictly improves shanten. Mirrors playing with Coach on.
function humanDiscard(G) {
  const pl = G.players[0];
  return R.rateDiscards(Game.handCounts(pl), pl.melds.length, Game.seenCounts(G, 0))[0].tile;
}

function humanClaim(G, claims) {
  const mine = claims.filter(function (c) { return c.player === 0; });
  if (!mine.length) return null;
  const win = mine.filter(function (c) { return c.type === 'win'; })[0];
  if (win) return win;
  const pl = G.players[0];
  const c = Game.handCounts(pl);
  const before = R.shanten(c, pl.melds.length);
  let best = null, bestSh = before;
  mine.forEach(function (m) {
    const c2 = c.slice();
    if (m.type === 'pung') c2[m.tile] -= 2;
    else if (m.type === 'kong') c2[m.tile] -= 3;
    else { c2[m.with[0]]--; c2[m.with[1]]--; }
    const sh = R.shanten(c2, pl.melds.length + 1);
    if (sh < bestSh) { bestSh = sh; best = m; }
  });
  return best;
}

const ORDER = { win: 0, kong: 1, pung: 2, chow: 3 };

function playGame(difficulty, dealer) {
  const G = Game.create({ difficulty: difficulty, dealer: dealer });
  let guard = 0, needDraw = true;
  while (guard++ < 800) {
    const pi = G.turn;
    if (needDraw) {
      if (Game.wallLeft(G) <= 0) { Game.endDraw(G); return { draw: true, wall: 0 }; }
      Game.draw(G, pi);
    }
    if (Game.canWinNow(G, pi)) return { winner: pi, selfDraw: true, wall: Game.wallLeft(G), G: G };
    const k = Game.aiSelfKong(G, pi);
    if (k) { Game.applySelfKong(G, pi, k); needDraw = false; continue; }

    Game.discard(G, pi, pi === 0 ? humanDiscard(G) : Game.aiDiscard(G, pi));

    const claims = Game.availableClaims(G);
    const want = [];
    const hc = humanClaim(G, claims);
    if (hc) want.push(hc);
    for (let p = 1; p < 4; p++) {
      if (p === G.lastDiscard.from) continue;
      const d = Game.aiClaimDecision(G, p, claims);
      if (d) want.push(d);
    }
    if (want.length) {
      const from = G.lastDiscard.from;
      want.sort(function (a, b) {
        return ORDER[a.type] - ORDER[b.type] ||
          ((a.player - from + 4) % 4) - ((b.player - from + 4) % 4);
      });
      const cc = want[0];
      if (cc.type === 'win') return { winner: cc.player, selfDraw: false, wall: Game.wallLeft(G), G: G };
      Game.applyClaim(G, cc);
      if (cc.type === 'kong') Game.drawReplacement(G, cc.player);
      needDraw = false;
      continue;
    }
    G.turn = (G.lastDiscard.from + 1) % 4;
    needDraw = true;
  }
  return { stuck: true };
}

function balance(difficulty, N) {
  const r = { human: 0, ai: 0, draw: 0, stuck: 0, leaks: 0 };
  const walls = [];
  for (let g = 0; g < N; g++) {
    const out = playGame(difficulty, g % 4);
    if (out.stuck) { r.stuck++; continue; }
    if (out.draw) r.draw++;
    else if (out.winner === 0) r.human++;
    else r.ai++;
    walls.push(out.wall);
    if (out.G) {
      const seen = R.emptyCounts();
      out.G.players.forEach(function (pl) {
        pl.hand.forEach(function (x) { seen[x]++; });
        pl.discards.forEach(function (x) { seen[x]++; });
        pl.melds.forEach(function (m) { m.tiles.forEach(function (x) { seen[x]++; }); });
      });
      for (let q = 0; q < 34; q++) if (seen[q] > 4) r.leaks++;
    }
  }
  walls.sort(function (a, b) { return a - b; });
  const pct = function (n) { return Math.round(n / N * 100) + '%'; };
  return {
    difficulty: difficulty,
    human: pct(r.human), ai: pct(r.ai), exhaustiveDraw: pct(r.draw),
    stuck: r.stuck, tileLeaks: r.leaks,
    medianWallLeft: walls.length ? walls[Math.floor(walls.length / 2)] : '-'
  };
}

const N = parseInt(process.argv[2], 10) || 60;
console.log('\n--- balance: coached human vs 3 AI, ' + N + ' games each ---');
const t0 = performance.now();
['gentle', 'standard', 'sharp'].forEach(function (d) {
  const b = balance(d, N);
  console.log('  ' + b.difficulty.padEnd(9) +
    ' human ' + b.human.padStart(4) +
    ' | ai ' + b.ai.padStart(4) +
    ' | draw ' + b.exhaustiveDraw.padStart(4) +
    ' | median wall left ' + String(b.medianWallLeft).padStart(3) +
    ' | leaks ' + b.tileLeaks + ' | stuck ' + b.stuck);
  if (b.tileLeaks > 0 || b.stuck > 0) failures++;
});
console.log('  (' + Math.round(performance.now() - t0) + 'ms)');

console.log('\n' + (failures === 0 ? 'All checks passed.' : failures + ' CHECK(S) FAILED.') + '\n');
process.exit(failures === 0 ? 0 : 1);
