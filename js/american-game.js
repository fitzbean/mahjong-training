/* ============================================================
   american-game.js — American mahjong engine

   152 tiles (136 + 8 flowers + 8 jokers), the Charleston, exposure-only
   claims, joker redemption, and card-driven wins.
   ============================================================ */
(function (global) {
  'use strict';

  var AI_NAMES = ['Ruth', 'Marcy', 'Estelle', 'Dot', 'Barb', 'Lena', 'Sylvia', 'Pearl'];

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildWall() {
    var w = [];
    for (var i = 0; i < 34; i++) for (var k = 0; k < 4; k++) w.push(i);
    for (var f = 0; f < 8; f++) w.push(T.FLOWER);
    for (var j = 0; j < 8; j++) w.push(T.JOKER);
    return shuffle(w);           // 136 + 8 + 8 = 152
  }

  /* The Charleston passes 3 tiles at a fixed offset around the table.
     Play moves 0 -> 1 -> 2 -> 3, so the player to your right is (i+1). */
  var CHARLESTON = [
    { dir: 1, name: 'right' },
    { dir: 2, name: 'across' },
    { dir: 3, name: 'left' },
    { dir: 3, name: 'left' },
    { dir: 2, name: 'across' },
    { dir: 1, name: 'right' }
  ];

  function create(opts) {
    opts = opts || {};
    var wall = buildWall();
    var names = shuffle(AI_NAMES.slice()).slice(0, 3);
    var dealer = opts.dealer === undefined ? 0 : opts.dealer;

    var G = {
      american: true,
      wall: wall,
      drawPos: 0,
      dealer: dealer,
      difficulty: opts.difficulty || 'standard',
      turn: dealer,
      phase: 'charleston',       // charleston | draw | discard | over
      charlestonStep: 0,         // 0..5, then courtesy
      courtesy: false,
      secondAsked: false,
      lastDiscard: null,
      over: false,
      result: null,
      players: []
    };

    for (var p = 0; p < 4; p++) {
      G.players.push({
        i: p,
        name: p === 0 ? 'You' : names[p - 1],
        isHuman: p === 0,
        hand: [],
        exposures: [],           // [{tiles:[...], jokers:n}]
        discards: [],
        drawnTile: null,
        concealed: true
      });
    }
    for (var d = 0; d < 13; d++) {
      for (var q = 0; q < 4; q++) G.players[q].hand.push(G.wall[G.drawPos++]);
    }
    G.players[dealer].hand.push(G.wall[G.drawPos++]);   // dealer starts with 14
    G.players.forEach(function (pl) { sortHand(pl.hand); });
    return G;
  }

  /** Sort so jokers and flowers group at the end, where they are easy to see. */
  function sortHand(h) {
    h.sort(function (a, b) { return a - b; });
  }

  function wallLeft(G) { return Math.max(0, G.wall.length - G.drawPos); }

  function draw(G, pi) {
    if (wallLeft(G) <= 0) return null;
    var t = G.wall[G.drawPos++];
    G.players[pi].hand.push(t);
    G.players[pi].drawnTile = t;
    return t;
  }

  function removeTile(hand, t) {
    var i = hand.indexOf(t);
    if (i >= 0) { hand.splice(i, 1); return true; }
    return false;
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

  /** Concealed hand plus everything already exposed — what the card sees. */
  function effectiveCounts(pl) {
    var c = AmCard.counts36(pl.hand);
    pl.exposures.forEach(function (e) {
      e.tiles.forEach(function (t) { c[t]++; });
    });
    return c;
  }

  function handSize(pl) {
    return pl.hand.length + pl.exposures.reduce(function (n, e) { return n + e.tiles.length; }, 0);
  }

  /* ============================================================
     Charleston
     ============================================================ */

  /** Jokers can never be passed. Everything else is fair game. */
  function passableTiles(pl) {
    return pl.hand.filter(function (t) { return t !== T.JOKER; });
  }

  /**
   * AI picks the three tiles it can most afford to lose.
   * rateDiscards already skips jokers, and we decrement as we go so the
   * next pick sees the reduced hand — every returned tile is really held.
   */
  function aiCharlestonPick(G, pi) {
    var pl = G.players[pi];
    var c = AmCard.counts36(pl.hand);     // Charleston happens before any exposure
    var out = [];
    for (var k = 0; k < 3; k++) {
      var rated = AmCard.rateDiscards(c, null);
      if (!rated.length) break;
      var t = rated[0].tile;
      c[t]--;
      out.push(t);
    }
    // Safety net for a hand that is somehow all jokers: pass whatever is legal.
    if (out.length < 3) {
      var spare = AmCard.counts36(pl.hand);
      out.forEach(function (t) { spare[t]--; });
      for (var i = 0; i < 36 && out.length < 3; i++) {
        while (i !== T.JOKER && spare[i] > 0 && out.length < 3) { spare[i]--; out.push(i); }
      }
    }
    return out.slice(0, 3);
  }

  /**
   * Execute one pass. `picks` is [tiles[3] per player].
   * Tiles move to (i + dir) % 4.
   */
  function applyPass(G, picks, dir) {
    var incoming = [[], [], [], []];
    for (var i = 0; i < 4; i++) {
      var pl = G.players[i];
      picks[i].forEach(function (t) { removeTile(pl.hand, t); });
      incoming[(i + dir) % 4] = picks[i].slice();
    }
    for (var j = 0; j < 4; j++) {
      incoming[j].forEach(function (t) { G.players[j].hand.push(t); });
      sortHand(G.players[j].hand);
    }
    return incoming;
  }

  /** Would this player like a second Charleston? Yes if still far out. */
  function aiWantsSecond(G, pi) {
    var r = AmCard.rank(effectiveCounts(G.players[pi]), null);
    return !r.length || r[0].missing >= 4;
  }

  /** Courtesy pass: how many tiles (0-3) this player wants to swap. */
  function aiCourtesyCount(G, pi) {
    var r = AmCard.rank(effectiveCounts(G.players[pi]), null);
    if (!r.length) return 0;
    return r[0].missing >= 5 ? 3 : r[0].missing >= 3 ? 2 : 0;
  }

  /* ============================================================
     Exposures & claims
     ============================================================ */

  /** The natural (non-joker) tile an exposure stands for. */
  function exposureTile(e) {
    for (var i = 0; i < e.tiles.length; i++) if (e.tiles[i] !== T.JOKER) return e.tiles[i];
    return -1;
  }

  /**
   * Can every one of these exposures sit in a distinct group of this
   * resolved hand? Each exposure must land on a group of the same tile that
   * is at least as large. Placed largest-first into the tightest fit.
   */
  function fitExposures(groups, exps) {
    if (!exps.length) return true;
    var used = new Array(groups.length);
    var list = exps.slice().sort(function (a, b) { return b.size - a.size; });
    for (var e = 0; e < list.length; e++) {
      var best = -1;
      for (var i = 0; i < groups.length; i++) {
        if (used[i] || groups[i].t !== list[e].tile || groups[i].c < list[e].size) continue;
        if (best < 0 || groups[i].c < groups[best].c) best = i;
      }
      if (best < 0) return false;
      used[best] = true;
    }
    return true;
  }

  function resolveGroups(hand, a, n) {
    var gs = [];
    for (var i = 0; i < hand.g.length; i++) {
      var t = AmCard.resolve(hand.g[i][1], a, n);
      if (t < 0) return null;
      gs.push({ c: hand.g[i][0], t: t });
    }
    return gs;
  }

  /**
   * Ways this player could legally claim tile `t` for an exposure.
   * An exposure needs 3+ matching tiles, and — crucially — the new exposure
   * together with every existing one must fit a single card hand. Without
   * that check a player can expose sets from incompatible hands until all 14
   * tiles are locked away and there is nothing left to discard.
   */
  function exposureOptions(pl, t) {
    if (t === T.JOKER) return [];              // a discarded joker is dead
    var inHand = AmCard.counts36(pl.hand);
    var jokers = inHand[T.JOKER] || 0;
    var have = inHand[t] || 0;

    var existing = pl.exposures.map(function (e) {
      return { size: e.tiles.length, tile: exposureTile(e) };
    });

    var sizes = {};
    AmCard.CARD.forEach(function (hand) {
      var nHi = hand.maxOff >= 0 ? 9 - hand.maxOff : 1;
      hand.assigns.forEach(function (a) {
        for (var n = 1; n <= nHi; n++) {
          var groups = resolveGroups(hand, a, n);
          if (!groups) continue;
          for (var gi = 0; gi < groups.length; gi++) {
            var need = groups[gi].c;
            if (need < 3 || groups[gi].t !== t) continue;
            var fromHand = need - 1;
            var real = Math.min(have, fromHand);
            if (real + Math.min(jokers, fromHand - real) < fromHand) continue;
            if (!fitExposures(groups, existing.concat([{ size: need, tile: t }]))) continue;
            var key = need + ':' + real;
            if (!sizes[key]) {
              sizes[key] = {
                tile: t, size: need, useReal: real,
                useJokers: fromHand - real, hand: hand
              };
            }
          }
        }
      });
    });

    var out = Object.keys(sizes).map(function (k) { return sizes[k]; });
    // Prefer bigger sets, and prefer spending fewer jokers for the same size.
    out.sort(function (a, b) {
      if (a.size !== b.size) return b.size - a.size;
      return a.useJokers - b.useJokers;
    });
    return out;
  }

  /** All legal responses to the current discard, best-priority first. */
  function availableClaims(G) {
    if (!G.lastDiscard) return [];
    var t = G.lastDiscard.tile, from = G.lastDiscard.from;
    var out = [];
    for (var p = 0; p < 4; p++) {
      if (p === from) continue;
      var pl = G.players[p];
      var c = effectiveCounts(pl);
      c[t]++;
      if (AmCard.isMahjong(c, null)) out.push({ player: p, type: 'mahjong', tile: t });
      c[t]--;
      exposureOptions(pl, t).forEach(function (o) {
        out.push({
          player: p, type: 'expose', tile: t, size: o.size,
          useReal: o.useReal, useJokers: o.useJokers
        });
      });
    }
    out.sort(function (a, b) {
      if ((a.type === 'mahjong') !== (b.type === 'mahjong')) return a.type === 'mahjong' ? -1 : 1;
      return (b.size || 0) - (a.size || 0);
    });
    return out;
  }

  function applyClaim(G, claim) {
    var pl = G.players[claim.player];
    var t = claim.tile;
    var from = G.lastDiscard.from;
    var river = G.players[from].discards;
    if (river[river.length - 1] === t) river.pop();

    var tiles = [t];
    for (var r = 0; r < claim.useReal; r++) { removeTile(pl.hand, t); tiles.push(t); }
    for (var j = 0; j < claim.useJokers; j++) { removeTile(pl.hand, T.JOKER); tiles.push(T.JOKER); }

    pl.exposures.push({ tiles: tiles, jokers: claim.useJokers, from: from });
    pl.concealed = false;
    sortHand(pl.hand);
    G.lastDiscard = null;
    G.turn = claim.player;
    return pl;
  }

  /* ============================================================
     Joker redemption — swap a natural tile for an exposed joker
     ============================================================ */
  function redemptionOptions(G, pi) {
    var pl = G.players[pi];
    var held = AmCard.counts36(pl.hand);
    var out = [];
    G.players.forEach(function (o) {
      o.exposures.forEach(function (e, ei) {
        if (!e.jokers) return;
        // Which natural tile does this exposure represent?
        var nat = e.tiles.filter(function (x) { return x !== T.JOKER; })[0];
        if (nat === undefined || !held[nat]) return;
        out.push({ owner: o.i, exposure: ei, tile: nat, ownerName: o.name });
      });
    });
    return out;
  }

  function applyRedemption(G, pi, opt) {
    var pl = G.players[pi];
    var ex = G.players[opt.owner].exposures[opt.exposure];
    var at = ex.tiles.indexOf(T.JOKER);
    if (at < 0) return false;
    if (!removeTile(pl.hand, opt.tile)) return false;
    ex.tiles[at] = opt.tile;
    ex.jokers--;
    pl.hand.push(T.JOKER);
    sortHand(pl.hand);
    return true;
  }

  /* ============================================================
     AI
     ============================================================ */
  var LEVELS = {
    gentle: { noise: 0.5, claimBar: 0 },
    standard: { noise: 0.28, claimBar: 1 },
    sharp: { noise: 0.05, claimBar: 1 }
  };
  function level(G) { return LEVELS[G.difficulty] || LEVELS.standard; }

  function aiDiscard(G, pi) {
    var pl = G.players[pi];
    var lv = level(G);
    if (!pl.hand.length) return undefined;      // caller must treat as a fault
    var rated = AmCard.rateDiscards(effectiveCounts(pl), null);

    // Only discard something actually in hand — exposures are locked away.
    var inHand = AmCard.counts36(pl.hand);
    rated = rated.filter(function (r) { return inHand[r.tile] > 0; });
    if (!rated.length) {
      // Everything concealed is a joker. Keep them if there is any choice.
      var nonJoker = pl.hand.filter(function (t) { return t !== T.JOKER; });
      return nonJoker.length ? nonJoker[0] : pl.hand[0];
    }

    if (lv.noise > 0 && Math.random() < lv.noise) {
      var pool = rated.filter(function (r) { return r.missing <= rated[0].missing + 1; });
      return pool[Math.floor(Math.random() * Math.min(pool.length, 3))].tile;
    }
    return rated[0].tile;
  }

  function aiClaimDecision(G, pi, claims) {
    var mine = claims.filter(function (c) { return c.player === pi; });
    if (!mine.length) return null;
    var win = mine.filter(function (c) { return c.type === 'mahjong'; })[0];
    if (win) return win;
    if (!level(G).claimBar) return null;

    var pl = G.players[pi];
    var before = AmCard.rank(effectiveCounts(pl), null);
    var beforeMissing = before.length ? before[0].missing : 99;

    var best = null, bestMissing = beforeMissing;
    mine.forEach(function (c) {
      // Simulate: the claimed tile joins an exposure, jokers get spent.
      var sim = effectiveCounts(pl);
      sim[c.tile]++;
      var after = AmCard.rank(sim, null);
      var m = after.length ? after[0].missing : 99;
      if (m < bestMissing) { bestMissing = m; best = c; }
    });
    // Exposing costs flexibility, so only do it for real progress.
    return bestMissing < beforeMissing ? best : null;
  }

  function aiRedemption(G, pi) {
    var opts = redemptionOptions(G, pi);
    if (!opts.length) return null;
    var pl = G.players[pi];
    var before = AmCard.rank(effectiveCounts(pl), null);
    var beforeM = before.length ? before[0].missing : 99;
    for (var i = 0; i < opts.length; i++) {
      var sim = effectiveCounts(pl);
      sim[opts[i].tile]--; sim[T.JOKER]++;
      var after = AmCard.rank(sim, null);
      if ((after.length ? after[0].missing : 99) <= beforeM) return opts[i];
    }
    return null;
  }

  /* ============================================================
     Endings
     ============================================================ */
  function canWinNow(G, pi) {
    var pl = G.players[pi];
    if (handSize(pl) !== 14) return null;
    return AmCard.isMahjong(effectiveCounts(pl), null);
  }

  function declareWin(G, pi, tile, selfDraw, from) {
    var pl = G.players[pi];
    var entry = AmCard.isMahjong(effectiveCounts(pl), null);
    G.over = true;
    G.phase = 'over';

    var value = entry ? entry.hand.value : 25;
    var concealedBonus = entry && entry.hand.concealed && pl.concealed;
    var total = value * (concealedBonus ? 2 : 1);

    // Payment: self-pick means everyone pays double; otherwise the player who
    // threw the tile pays double and the other two pay single.
    var payers = [];
    for (var p = 0; p < 4; p++) {
      if (p === pi) continue;
      var mult = selfDraw ? 2 : (p === from ? 2 : 1);
      payers.push({ player: p, name: G.players[p].name, pays: total * mult });
    }
    var collected = payers.reduce(function (n, x) { return n + x.pays; }, 0);

    G.result = {
      winner: pi, selfDraw: selfDraw, from: from, winTile: tile,
      entry: entry, value: value, concealedBonus: concealedBonus,
      payers: payers, total: collected, draw: false
    };
    return G.result;
  }

  function endWall(G) {
    G.over = true;
    G.phase = 'over';
    G.result = {
      draw: true,
      closest: G.players.map(function (pl) {
        var r = AmCard.rank(effectiveCounts(pl), null);
        return r.length ? r[0].missing : 99;
      })
    };
    return G.result;
  }

  /* ---------- coaching ---------- */
  function coachFor(G, pi) {
    var pl = G.players[pi];
    var c = effectiveCounts(pl);
    var ranked = AmCard.rank(c, null);
    var out = { top: ranked.slice(0, 3), missing: ranked.length ? ranked[0].missing : 99 };
    if (handSize(pl) === 14) {
      var inHand = AmCard.counts36(pl.hand);
      out.rated = AmCard.rateDiscards(c, null).filter(function (r) { return inHand[r.tile] > 0; });
      out.best = out.rated[0];
    } else {
      out.help = AmCard.helpfulTiles(c, null, 3);
    }
    return out;
  }

  global.AmGame = {
    CHARLESTON: CHARLESTON,
    create: create, sortHand: sortHand, wallLeft: wallLeft, draw: draw, discard: discard,
    effectiveCounts: effectiveCounts, handSize: handSize, passableTiles: passableTiles,
    aiCharlestonPick: aiCharlestonPick, applyPass: applyPass,
    aiWantsSecond: aiWantsSecond, aiCourtesyCount: aiCourtesyCount,
    exposureOptions: exposureOptions, availableClaims: availableClaims, applyClaim: applyClaim,
    redemptionOptions: redemptionOptions, applyRedemption: applyRedemption,
    aiDiscard: aiDiscard, aiClaimDecision: aiClaimDecision, aiRedemption: aiRedemption,
    canWinNow: canWinNow, declareWin: declareWin, endWall: endWall,
    coachFor: coachFor, shuffle: shuffle
  };
})(window);
