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

['tiles.js', 'rules.js', 'game.js', 'lessons.js'].forEach(function (f) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(src, ctx, { filename: 'js/' + f });
});

const { T, R, Game, tt } = ctx;

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
