/* ============================================================
   game.js — four-player mahjong engine + AI opponents
   Seat 0 is always the human, drawn at the bottom of the table.
   Play passes 0 -> 1 -> 2 -> 3 (counter-clockwise).
   ============================================================ */
(function (global) {
  'use strict';

  var AI_NAMES = ['Mei', 'Kenji', 'Ravi', 'Sofia', 'Yuki', 'Tomas', 'Ana', 'Jin'];

  function shuffle(a, rng) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor((rng ? rng() : Math.random()) * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickNames() {
    var pool = AI_NAMES.slice();
    shuffle(pool);
    return pool.slice(0, 3);
  }

  function create(opts) {
    opts = opts || {};
    var wall = [];
    for (var i = 0; i < 34; i++) for (var k = 0; k < 4; k++) wall.push(i);
    shuffle(wall);

    var names = pickNames();
    var dealer = opts.dealer === undefined ? 0 : opts.dealer;

    var G = {
      wall: wall,
      // Last 14 tiles are the "dead wall" — replacements for kongs.
      liveEnd: wall.length - 14,
      drawPos: 0,
      deadPos: wall.length - 1,
      dealer: dealer,
      roundWind: opts.roundWind || 0,
      difficulty: opts.difficulty || 'standard',
      turn: dealer,
      phase: 'draw',          // draw | discard | claim | over
      lastDiscard: null,      // {tile, from}
      justDrew: null,
      claims: [],
      over: false,
      result: null,
      log: [],
      players: []
    };

    for (var p = 0; p < 4; p++) {
      G.players.push({
        i: p,
        name: p === 0 ? 'You' : names[p - 1],
        isHuman: p === 0,
        seat: (p - dealer + 4) % 4,   // 0=East(dealer) 1=South 2=West 3=North
        hand: [],
        melds: [],
        discards: [],
        drawnTile: null,
        concealed: true
      });
    }

    for (var round = 0; round < 13; round++) {
      for (var q = 0; q < 4; q++) G.players[q].hand.push(G.wall[G.drawPos++]);
    }
    G.players.forEach(function (pl) { sortHand(pl.hand); });

    return G;
  }

  function sortHand(h) { h.sort(function (a, b) { return a - b; }); }

  function wallLeft(G) { return Math.max(0, G.liveEnd - G.drawPos); }

  function draw(G, pi) {
    if (wallLeft(G) <= 0) return null;
    var t = G.wall[G.drawPos++];
    var pl = G.players[pi];
    pl.hand.push(t);
    pl.drawnTile = t;
    return t;
  }

  function drawReplacement(G, pi) {
    var t = G.wall[G.deadPos--];
    G.liveEnd--; // dead wall stays 14 tiles: the live wall shrinks
    var pl = G.players[pi];
    pl.hand.push(t);
    pl.drawnTile = t;
    return t;
  }

  function removeTile(hand, t) {
    var i = hand.indexOf(t);
    if (i >= 0) hand.splice(i, 1);
    return i >= 0;
  }

  function discard(G, pi, tile) {
    var pl = G.players[pi];
    if (!removeTile(pl.hand, tile)) return false;
    pl.discards.push(tile);
    pl.drawnTile = null;
    sortHand(pl.hand);
    G.lastDiscard = { tile: tile, from: pi };
    return true;
  }

  /** Every tile any player can see right now. */
  function seenCounts(G, viewer) {
    var c = R.emptyCounts();
    G.players.forEach(function (pl) {
      pl.discards.forEach(function (t) { c[t]++; });
      pl.melds.forEach(function (m) { m.tiles.forEach(function (t) { c[t]++; }); });
      if (pl.i === viewer) pl.hand.forEach(function (t) { c[t]++; });
    });
    return c;
  }

  function handCounts(pl) { return R.counts(pl.hand); }

  /* ------------------------------------------------------------
     Claims
     ------------------------------------------------------------ */

  /**
   * What could each player do with the tile that was just discarded?
   * Ordered by priority: win > kong > pung > chow.
   */
  function availableClaims(G) {
    if (!G.lastDiscard) return [];
    var t = G.lastDiscard.tile, from = G.lastDiscard.from;
    var out = [];
    for (var p = 0; p < 4; p++) {
      if (p === from) continue;
      var pl = G.players[p];
      var c = handCounts(pl);
      c[t]++;
      if (R.isWin(c, pl.melds.length)) out.push({ player: p, type: 'win', tile: t });
      c[t]--;
      if (R.canKong(c, t)) out.push({ player: p, type: 'kong', tile: t });
      if (R.canPung(c, t)) out.push({ player: p, type: 'pung', tile: t });
      if (p === (from + 1) % 4) {
        R.chowOptions(c, t).forEach(function (pairT) {
          out.push({ player: p, type: 'chow', tile: t, with: pairT });
        });
      }
    }
    var order = { win: 0, kong: 1, pung: 2, chow: 3 };
    out.sort(function (a, b) { return order[a.type] - order[b.type]; });
    return out;
  }

  function applyClaim(G, claim) {
    var pl = G.players[claim.player];
    var t = claim.tile;
    var from = G.lastDiscard.from;
    // The claimed tile leaves the discarder's river.
    var river = G.players[from].discards;
    if (river[river.length - 1] === t) river.pop();

    if (claim.type === 'pung') {
      removeTile(pl.hand, t); removeTile(pl.hand, t);
      pl.melds.push({ type: 'pung', tile: t, tiles: [t, t, t], concealed: false, from: from });
    } else if (claim.type === 'kong') {
      removeTile(pl.hand, t); removeTile(pl.hand, t); removeTile(pl.hand, t);
      pl.melds.push({ type: 'kong', tile: t, tiles: [t, t, t, t], concealed: false, from: from });
    } else if (claim.type === 'chow') {
      removeTile(pl.hand, claim.with[0]);
      removeTile(pl.hand, claim.with[1]);
      var trio = [t, claim.with[0], claim.with[1]].sort(function (a, b) { return a - b; });
      pl.melds.push({ type: 'chow', tile: trio[0], tiles: trio, concealed: false, from: from });
    }
    pl.concealed = false;
    sortHand(pl.hand);
    G.lastDiscard = null;
    G.turn = claim.player;
    return pl;
  }

  /** Concealed kong (4 in hand) or adding to an existing pung. */
  function selfKongOptions(G, pi) {
    var pl = G.players[pi];
    var c = handCounts(pl);
    var out = [];
    for (var i = 0; i < 34; i++) if (c[i] === 4) out.push({ type: 'concealed', tile: i });
    pl.melds.forEach(function (m) {
      if (m.type === 'pung' && c[m.tile] > 0) out.push({ type: 'extend', tile: m.tile });
    });
    return out;
  }

  function applySelfKong(G, pi, opt) {
    var pl = G.players[pi];
    if (opt.type === 'concealed') {
      for (var k = 0; k < 4; k++) removeTile(pl.hand, opt.tile);
      pl.melds.push({ type: 'kong', tile: opt.tile, tiles: [opt.tile, opt.tile, opt.tile, opt.tile], concealed: true });
    } else {
      removeTile(pl.hand, opt.tile);
      for (var m = 0; m < pl.melds.length; m++) {
        if (pl.melds[m].type === 'pung' && pl.melds[m].tile === opt.tile) {
          pl.melds[m] = { type: 'kong', tile: opt.tile, tiles: [opt.tile, opt.tile, opt.tile, opt.tile], concealed: false };
          break;
        }
      }
      pl.concealed = false;
    }
    sortHand(pl.hand);
    return drawReplacement(G, pi);
  }

  /* ------------------------------------------------------------
     AI
     ------------------------------------------------------------ */
  /**
   * Four max-efficiency AIs finish hands so fast that a learner never gets a
   * turn to matter. `noise` is the chance of taking a merely-good discard
   * instead of the best one; `minShantenToOpen` caps how far out they will
   * claim from. Tuned so a coached human wins a fair share.
   */
  var LEVELS = {
    gentle: { noise: 0.55, claimChow: 0, claimPung: 1, minShantenToOpen: 1 },
    standard: { noise: 0.32, claimChow: 1, claimPung: 1, minShantenToOpen: 2 },
    sharp: { noise: 0.05, claimChow: 1, claimPung: 1, minShantenToOpen: 4 }
  };

  function level(G) { return LEVELS[G.difficulty] || LEVELS.standard; }

  /** Choose a discard for an AI player. */
  function aiDiscard(G, pi) {
    var pl = G.players[pi];
    var lv = level(G);
    var seen = seenCounts(G, pi);
    var c = handCounts(pl);
    var rated = R.rateDiscards(c, pl.melds.length, seen);
    if (!rated.length) return pl.hand[0];

    // Late in the hand, lean towards tiles already thrown by someone else.
    if (wallLeft(G) < 30) {
      var thrown = R.emptyCounts();
      G.players.forEach(function (o) {
        if (o.i !== pi) o.discards.forEach(function (t) { thrown[t]++; });
      });
      rated.forEach(function (r) { r.safeBonus = thrown[r.tile] > 0 ? 1 : 0; });
      rated.sort(function (a, b) {
        if (a.shanten !== b.shanten) return a.shanten - b.shanten;
        var d = (b.ukeire + b.safeBonus * 3) - (a.ukeire + a.safeBonus * 3);
        return d;
      });
    }

    // Weaker opponents sometimes take a merely-decent option.
    if (lv.noise > 0 && Math.random() < lv.noise) {
      var pool = rated.filter(function (r) { return r.shanten <= rated[0].shanten + 1; });
      return pool[Math.floor(Math.random() * Math.min(pool.length, 3))].tile;
    }
    return rated[0].tile;
  }

  /** Decide whether an AI takes a claim. Returns the claim or null. */
  function aiClaimDecision(G, pi, claims) {
    var mine = claims.filter(function (c) { return c.player === pi; });
    if (!mine.length) return null;
    var pl = G.players[pi];
    var lv = level(G);

    var win = mine.filter(function (c) { return c.type === 'win'; })[0];
    if (win) return win;

    var c = handCounts(pl);
    var before = R.shanten(c, pl.melds.length);

    var kong = mine.filter(function (x) { return x.type === 'kong'; })[0];
    if (kong && before <= 2) return kong;

    var pung = mine.filter(function (x) { return x.type === 'pung'; })[0];
    if (pung && lv.claimPung) {
      var c2 = c.slice(); c2[pung.tile] -= 2;
      var after = R.shanten(c2, pl.melds.length + 1);
      var valuable = pung.tile >= 31 || pung.tile === 27 + pl.seat || pung.tile === 27 + G.roundWind;
      if (after < before || (after === before && valuable)) {
        if (before <= lv.minShantenToOpen || valuable) return pung;
      }
    }

    var chows = mine.filter(function (x) { return x.type === 'chow'; });
    if (chows.length && lv.claimChow) {
      var best = null, bestSh = 99;
      chows.forEach(function (ch) {
        var c3 = c.slice();
        c3[ch.with[0]]--; c3[ch.with[1]]--;
        var sh = R.shanten(c3, pl.melds.length + 1);
        if (sh < bestSh) { bestSh = sh; best = ch; }
      });
      if (best && bestSh < before && before <= lv.minShantenToOpen) return best;
    }
    return null;
  }

  /** Should an AI declare a self-kong? Only when it can't hurt. */
  function aiSelfKong(G, pi) {
    var pl = G.players[pi];
    var opts = selfKongOptions(G, pi);
    if (!opts.length) return null;
    var c = handCounts(pl);
    var before = R.shanten(c, pl.melds.length);
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      var c2 = c.slice();
      c2[o.tile] -= (o.type === 'concealed' ? 4 : 1);
      var after = R.shanten(c2, pl.melds.length + (o.type === 'concealed' ? 1 : 0));
      if (after <= before) return o;
    }
    return null;
  }

  /* ------------------------------------------------------------
     Win resolution & scoring
     ------------------------------------------------------------ */
  function buildResult(G, pi, winTile, selfDraw, fromPlayer) {
    var pl = G.players[pi];
    var c = handCounts(pl);
    var sets = [];
    var sevenPairs = R.isSevenPairs(c, pl.melds.length);
    var thirteen = R.isThirteenOrphans(c, pl.melds.length);

    pl.melds.forEach(function (m) {
      sets.push({ type: m.type === 'kong' ? 'kong' : m.type, tile: m.tile, tiles: m.tiles, concealed: !!m.concealed });
    });

    if (sevenPairs) {
      for (var i = 0; i < 34; i++) if (c[i] === 2) sets.push({ type: 'pair', tile: i, tiles: [i, i], concealed: true });
    } else if (thirteen) {
      R.ORPHANS.forEach(function (i) { sets.push({ type: 'pair', tile: i, tiles: [i], concealed: true }); });
    } else {
      var dec = R.decompose(c, pl.melds.length);
      if (dec) dec.forEach(function (s) { sets.push(s); });
    }

    var sc = R.score(sets, {
      seatWind: pl.seat,
      roundWind: G.roundWind,
      selfDraw: selfDraw,
      concealed: pl.concealed,
      sevenPairs: sevenPairs,
      thirteenOrphans: thirteen,
      lastTileOfWall: wallLeft(G) === 0
    });

    return {
      winner: pi, winTile: winTile, selfDraw: selfDraw, from: fromPlayer,
      sets: sets, score: sc, draw: false
    };
  }

  function endDraw(G) {
    G.over = true;
    G.phase = 'over';
    G.result = { draw: true, tenpai: G.players.map(function (pl) {
      return R.shanten(handCounts(pl), pl.melds.length) <= 0;
    }) };
    return G.result;
  }

  function declareWin(G, pi, tile, selfDraw, from) {
    G.over = true;
    G.phase = 'over';
    G.result = buildResult(G, pi, tile, selfDraw, from);
    return G.result;
  }

  /** Can this player declare a win right now with the tile in hand? */
  function canWinNow(G, pi) {
    var pl = G.players[pi];
    return R.isWin(handCounts(pl), pl.melds.length);
  }

  /* ------------------------------------------------------------
     Coaching helpers used by the play screen
     ------------------------------------------------------------ */
  function coachFor(G, pi) {
    var pl = G.players[pi];
    var c = handCounts(pl);
    var m = pl.melds.length;
    var seen = seenCounts(G, pi);
    var out = { shanten: R.shanten(c, m), melds: m };
    if (pl.hand.length === 14 - m * 3) {
      var rated = R.rateDiscards(c, m, seen);
      out.rated = rated;
      out.best = rated[0];
    } else {
      out.waits = R.winningTiles(c, m);
      out.useful = R.usefulTiles(c, m);
    }
    return out;
  }

  global.Game = {
    create: create, sortHand: sortHand, wallLeft: wallLeft,
    draw: draw, drawReplacement: drawReplacement, discard: discard,
    availableClaims: availableClaims, applyClaim: applyClaim,
    selfKongOptions: selfKongOptions, applySelfKong: applySelfKong,
    aiDiscard: aiDiscard, aiClaimDecision: aiClaimDecision, aiSelfKong: aiSelfKong,
    canWinNow: canWinNow, declareWin: declareWin, endDraw: endDraw,
    handCounts: handCounts, seenCounts: seenCounts, coachFor: coachFor,
    shuffle: shuffle
  };
})(window);
