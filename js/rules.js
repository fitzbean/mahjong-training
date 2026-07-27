/* ============================================================
   rules.js — hand maths
   A "counts" array is length 34: counts[i] = how many of tile i.
   `melds` is the number of already-claimed sets (each = 3 tiles
   removed from the concealed hand).
   ============================================================ */
(function (global) {
  'use strict';

  function emptyCounts() { return new Array(34).fill(0); }

  function counts(tiles) {
    var c = emptyCounts();
    for (var i = 0; i < tiles.length; i++) c[tiles[i]]++;
    return c;
  }

  function total(c) {
    var n = 0;
    for (var i = 0; i < 34; i++) n += c[i];
    return n;
  }

  function toTiles(c) {
    var out = [];
    for (var i = 0; i < 34; i++) for (var k = 0; k < c[i]; k++) out.push(i);
    return out;
  }

  var isSuit = function (i) { return i < 27; };
  var rank = function (i) { return i < 27 ? (i % 9) + 1 : i - 26; };

  /* ------------------------------------------------------------
     Standard shanten: 8 - 2*sets - partials, with a pair bonus.
     Explored by recursive decomposition over the 34 tile kinds.
     ------------------------------------------------------------ */
  var shantenCache = new Map();

  function shantenStandard(c, melds) {
    var key = c.join('') + '|' + melds;
    var hit = shantenCache.get(key);
    if (hit !== undefined) return hit;

    var best = 8;
    var work = c.slice();

    function rec(i, sets, parts, pair) {
      var blocks = melds + sets + parts + pair;
      // Prune: score achievable now can never be beaten past this point if
      // we've already used all five blocks.
      var sh = 8 - 2 * (melds + sets) - (parts + pair);
      if (blocks === 5 && pair === 0) sh += 1;
      if (sh < best) best = sh;
      if (best === -1) return;

      while (i < 34 && work[i] === 0) i++;
      if (i >= 34) return;

      var s = isSuit(i), r = rank(i);
      var canBlock = blocks < 5;

      // Triplet
      if (work[i] >= 3 && melds + sets < 4 && canBlock) {
        work[i] -= 3; rec(i, sets + 1, parts, pair); work[i] += 3;
      }
      // Run
      if (s && r <= 7 && work[i + 1] > 0 && work[i + 2] > 0 && melds + sets < 4 && canBlock) {
        work[i]--; work[i + 1]--; work[i + 2]--;
        rec(i, sets + 1, parts, pair);
        work[i]++; work[i + 1]++; work[i + 2]++;
      }
      // Pair (the hand's one pair)
      if (work[i] >= 2 && pair === 0 && canBlock) {
        work[i] -= 2; rec(i, sets, parts, 1); work[i] += 2;
      }
      // Partial: two of a kind waiting to become a triplet
      if (work[i] >= 2 && canBlock) {
        work[i] -= 2; rec(i, sets, parts + 1, pair); work[i] += 2;
      }
      // Partial: adjacent / gapped pair of numbers
      if (s && r <= 8 && work[i + 1] > 0 && canBlock) {
        work[i]--; work[i + 1]--; rec(i, sets, parts + 1, pair); work[i]++; work[i + 1]++;
      }
      if (s && r <= 7 && work[i + 2] > 0 && canBlock) {
        work[i]--; work[i + 2]--; rec(i, sets, parts + 1, pair); work[i]++; work[i + 2]++;
      }
      // Discard as a floater
      work[i]--; rec(i, sets, parts, pair); work[i]++;
    }

    rec(0, 0, 0, 0);
    if (shantenCache.size > 60000) shantenCache.clear();
    shantenCache.set(key, best);
    return best;
  }

  /** Seven Pairs — only possible with a fully concealed hand. */
  function shantenSevenPairs(c, melds) {
    if (melds > 0) return 99;
    var pairs = 0, kinds = 0;
    for (var i = 0; i < 34; i++) {
      if (c[i] > 0) kinds++;
      if (c[i] >= 2) pairs++;
    }
    return 6 - pairs + Math.max(0, 7 - kinds);
  }

  var ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

  /** Thirteen Orphans — one of each terminal & honour, plus a pair of any. */
  function shantenThirteen(c, melds) {
    if (melds > 0) return 99;
    var kinds = 0, hasPair = 0;
    for (var k = 0; k < ORPHANS.length; k++) {
      var i = ORPHANS[k];
      if (c[i] > 0) kinds++;
      if (c[i] >= 2) hasPair = 1;
    }
    return 13 - kinds - hasPair;
  }

  /** Best shanten across every hand shape. -1 means the hand is complete. */
  function shanten(c, melds) {
    melds = melds || 0;
    var a = shantenStandard(c, melds);
    var b = shantenSevenPairs(c, melds);
    var d = shantenThirteen(c, melds);
    return Math.min(a, b, d);
  }

  /* ------------------------------------------------------------
     Winning decomposition — returns the actual sets, for scoring.
     ------------------------------------------------------------ */
  /**
   * Break a complete hand into its sets. Returns [{type,tile,tiles}] with the
   * pair included as one entry, or null if the tiles do not form a win.
   * `nSets` is tracked separately from `out` because the pair also lives in
   * `out` but must not count towards the four sets.
   */
  function decompose(c, meldCount) {
    var need = 4 - meldCount;
    var work = c.slice();
    var out = [];
    var found = null;

    function remaining() {
      var left = 0;
      for (var q = 0; q < 34; q++) left += work[q];
      return left;
    }

    function rec(i, nSets, pairUsed) {
      if (found) return;
      if (nSets === need && pairUsed) {
        if (remaining() === 0) found = out.slice();
        return;
      }
      while (i < 34 && work[i] === 0) i++;
      if (i >= 34) return;

      if (!pairUsed && work[i] >= 2) {
        work[i] -= 2;
        out.push({ type: 'pair', tile: i, tiles: [i, i], concealed: true });
        rec(0, nSets, true);
        out.pop(); work[i] += 2;
        if (found) return;
      }
      if (nSets < need) {
        if (work[i] >= 3) {
          work[i] -= 3;
          out.push({ type: 'pung', tile: i, tiles: [i, i, i], concealed: true });
          rec(i, nSets + 1, pairUsed);
          out.pop(); work[i] += 3;
          if (found) return;
        }
        if (isSuit(i) && rank(i) <= 7 && work[i + 1] > 0 && work[i + 2] > 0) {
          work[i]--; work[i + 1]--; work[i + 2]--;
          out.push({ type: 'chow', tile: i, tiles: [i, i + 1, i + 2], concealed: true });
          rec(i, nSets + 1, pairUsed);
          out.pop();
          work[i]++; work[i + 1]++; work[i + 2]++;
          if (found) return;
        }
      }
      // The lowest remaining tile fits nothing — this branch is a dead end.
    }

    rec(0, 0, false);
    return found;
  }

  function isSevenPairs(c, melds) {
    if (melds > 0) return false;
    var pairs = 0;
    for (var i = 0; i < 34; i++) {
      if (c[i] === 0) continue;
      if (c[i] === 2) pairs++;
      else return false; // 4-of-a-kind does not count as two pairs here
    }
    return pairs === 7;
  }

  function isThirteenOrphans(c, melds) {
    if (melds > 0) return false;
    if (total(c) !== 14) return false;
    var pair = 0;
    for (var i = 0; i < 34; i++) {
      var want = ORPHANS.indexOf(i) >= 0;
      if (!want && c[i] > 0) return false;
      if (want) {
        if (c[i] === 0) return false;
        if (c[i] === 2) pair++;
        else if (c[i] !== 1) return false;
      }
    }
    return pair === 1;
  }

  function isWin(c, melds) {
    melds = melds || 0;
    if (total(c) !== 14 - melds * 3) return false;
    if (isSevenPairs(c, melds)) return true;
    if (isThirteenOrphans(c, melds)) return true;
    return decompose(c, melds) !== null;
  }

  /* ------------------------------------------------------------
     Waits & acceptance
     ------------------------------------------------------------ */

  /** Tiles that would immediately complete a 13-tile hand. */
  function winningTiles(c, melds) {
    melds = melds || 0;
    var out = [];
    for (var i = 0; i < 34; i++) {
      if (c[i] >= 4) continue;
      c[i]++;
      if (isWin(c, melds)) out.push(i);
      c[i]--;
    }
    return out;
  }

  /** Tiles that would reduce shanten ("ukeire" / acceptance). */
  function usefulTiles(c, melds) {
    melds = melds || 0;
    var base = shanten(c, melds);
    var out = [];
    for (var i = 0; i < 34; i++) {
      if (c[i] >= 4) continue;
      c[i]++;
      if (shanten(c, melds) < base) out.push(i);
      c[i]--;
    }
    return out;
  }

  /**
   * Rank every discard from a 14-tile hand.
   * `seen` optionally counts tiles already visible (discards/melds) so
   * acceptance reflects what is actually still available.
   * Returns [{tile, shanten, ukeire, tiles}] sorted best-first.
   */
  function rateDiscards(c, melds, seen) {
    melds = melds || 0;
    var results = [];
    for (var t = 0; t < 34; t++) {
      if (c[t] === 0) continue;
      c[t]--;
      var sh = shanten(c, melds);
      var accept = usefulTiles(c, melds);
      var live = 0;
      for (var k = 0; k < accept.length; k++) {
        var a = accept[k];
        var used = c[a] + (seen ? seen[a] : 0);
        live += Math.max(0, 4 - used);
      }
      results.push({ tile: t, shanten: sh, ukeire: live, tiles: accept });
      c[t]++;
    }
    results.sort(function (a, b) {
      if (a.shanten !== b.shanten) return a.shanten - b.shanten;
      if (a.ukeire !== b.ukeire) return b.ukeire - a.ukeire;
      // Prefer letting go of honours/terminals when otherwise equal.
      return safetyBias(b.tile) - safetyBias(a.tile);
    });
    return results;
  }

  /** Higher = more willing to throw away. Isolated honours go first. */
  function safetyBias(t) {
    if (t >= 31) return 3;      // dragons
    if (t >= 27) return 4;      // winds
    var r = rank(t);
    if (r === 1 || r === 9) return 2;
    if (r === 2 || r === 8) return 1;
    return 0;
  }

  /* ------------------------------------------------------------
     Claim legality
     ------------------------------------------------------------ */
  function canPung(c, t) { return c[t] >= 2; }
  function canKong(c, t) { return c[t] >= 3; }

  /** All chow shapes in hand that can absorb tile t. Each is the pair held. */
  function chowOptions(c, t) {
    if (!isSuit(t)) return [];
    var r = rank(t), out = [];
    if (r >= 3 && c[t - 2] > 0 && c[t - 1] > 0) out.push([t - 2, t - 1]);
    if (r >= 2 && r <= 8 && c[t - 1] > 0 && c[t + 1] > 0) out.push([t - 1, t + 1]);
    if (r <= 7 && c[t + 1] > 0 && c[t + 2] > 0) out.push([t + 1, t + 2]);
    return out;
  }

  /* ------------------------------------------------------------
     Scoring — a simplified Chinese-classical style fan table.
     Enough patterns to teach the idea without drowning a beginner.
     ------------------------------------------------------------ */
  var WIND_NAMES = ['East', 'South', 'West', 'North'];

  /**
   * ctx: {melds:[{type,tile,concealed}], pair, selfDraw, concealed,
   *       seatWind:0-3, roundWind:0-3, lastTile}
   */
  function score(allSets, ctx) {
    var pts = 20, fan = 0, lines = [];
    var chows = 0, pungs = 0, kongs = 0, concealedPungs = 0;
    var suitsUsed = {}, hasHonor = false, allMajor = true, allSimple = true;

    function note(label, f) { fan += f; lines.push({ label: label, fan: f }); }

    // Whole-hand patterns are only meaningful for a whole hand. Without this
    // guard an incomplete decomposition scores as "All Honours + All Simples".
    var tileTotal = allSets.reduce(function (n, s) { return n + s.tiles.length; }, 0);
    if (tileTotal < 13) return { base: pts, fan: 0, lines: [], total: pts };

    allSets.forEach(function (s) {
      s.tiles.forEach(function (t) {
        if (t < 27) suitsUsed[t < 9 ? 'm' : t < 18 ? 'p' : 's'] = true;
        else hasHonor = true;
        var r = rank(t);
        if (t < 27 && r !== 1 && r !== 9) allMajor = false;
        if (t >= 27 || r === 1 || r === 9) allSimple = false;
      });
      if (s.type === 'chow') chows++;
      else if (s.type === 'pung') {
        pungs++;
        var major = s.tile >= 27 || rank(s.tile) === 1 || rank(s.tile) === 9;
        pts += (major ? 4 : 2) * (s.concealed ? 2 : 1);
        if (s.concealed) concealedPungs++;
      } else if (s.type === 'kong') {
        kongs++;
        var maj2 = s.tile >= 27 || rank(s.tile) === 1 || rank(s.tile) === 9;
        pts += (maj2 ? 16 : 8) * (s.concealed ? 2 : 1);
        if (s.concealed) concealedPungs++;
      }
    });

    // Pair value
    var pair = allSets.filter(function (s) { return s.type === 'pair'; })[0];
    if (pair) {
      if (pair.tile >= 31) { pts += 2; }
      else if (pair.tile === 27 + ctx.seatWind || pair.tile === 27 + ctx.roundWind) pts += 2;
    }

    if (ctx.sevenPairs) {
      pts = 30;
      note('Seven Pairs', 2);
    }
    if (ctx.thirteenOrphans) {
      pts = 100;
      note('Thirteen Orphans', 13);
    }

    allSets.forEach(function (s) {
      if (s.type !== 'pung' && s.type !== 'kong') return;
      if (s.tile >= 31) note((s.tile === 31 ? 'White' : s.tile === 32 ? 'Green' : 'Red') + ' Dragon set', 1);
      else if (s.tile === 27 + ctx.seatWind) note('Seat Wind set (' + WIND_NAMES[ctx.seatWind] + ')', 1);
      else if (s.tile === 27 + ctx.roundWind) note('Round Wind set (' + WIND_NAMES[ctx.roundWind] + ')', 1);
    });

    var suitCount = Object.keys(suitsUsed).length;
    if (suitCount === 1 && !hasHonor) note('Full Flush — one suit only', 4);
    else if (suitCount === 1 && hasHonor) note('Half Flush — one suit + honours', 2);
    else if (suitCount === 0) note('All Honours', 10);

    if (!ctx.sevenPairs && chows === 0 && (pungs + kongs) >= 4) note('All Pungs', 2);
    if (allSimple) note('All Simples — no terminals or honours', 1);
    if (allMajor && !ctx.sevenPairs) note('All Terminals & Honours', 4);
    if (ctx.concealed) note('Fully Concealed hand', 1);
    if (ctx.selfDraw) note('Self-Draw', 1);
    if (concealedPungs >= 3) note('Three Concealed Pungs', 2);
    if (ctx.lastTileOfWall) note('Last Tile from the Wall', 1);

    var totalPts = Math.round(pts * Math.pow(2, Math.min(fan, 13)));
    return { base: pts, fan: fan, lines: lines, total: Math.min(totalPts, 20000) };
  }

  global.R = {
    emptyCounts: emptyCounts, counts: counts, total: total, toTiles: toTiles,
    shanten: shanten, shantenStandard: shantenStandard,
    shantenSevenPairs: shantenSevenPairs, shantenThirteen: shantenThirteen,
    decompose: decompose, isWin: isWin, isSevenPairs: isSevenPairs,
    isThirteenOrphans: isThirteenOrphans,
    winningTiles: winningTiles, usefulTiles: usefulTiles, rateDiscards: rateDiscards,
    canPung: canPung, canKong: canKong, chowOptions: chowOptions,
    safetyBias: safetyBias, score: score, ORPHANS: ORPHANS, WIND_NAMES: WIND_NAMES
  };
})(window);
