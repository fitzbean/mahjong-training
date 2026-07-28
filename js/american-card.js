/* ============================================================
   american-card.js — the hand card and its matcher

   IMPORTANT: this is an ORIGINAL card written for this app. It is not
   the National Mah Jongg League card, which is copyrighted and
   republished every year. The categories imitate the NMJL style so the
   skill transfers, but no official hand is reproduced here.

   --- pattern language ---
   A hand is a list of groups: [count, spec].
     count 1=single 2=pair 3=pung 4=kong 5=quint
     Jokers may fill groups of 3 or more, never singles or pairs.

   spec:
     'F'            flower (all 8 are interchangeable)
     'E' 'S' 'W' 'N'  winds
     'Z'            white dragon — doubles as the digit 0 ("soap")
     'dA' 'dB' 'dC' the dragon belonging to suit variable A/B/C
     'A5'           rank 5 of suit variable A
     'A+0'..'A+4'   rank n, n+1 ... for consecutive-run hands

   Suit variables A, B, C are always assigned DIFFERENT suits.
   ============================================================ */
(function (global) {
  'use strict';

  var SUITS = ['m', 'p', 's'];
  var WIND = { E: 27, S: 28, W: 29, N: 30 };
  var SOAP = 31;

  function counts36(tiles) {
    var c = new Array(36).fill(0);
    for (var i = 0; i < tiles.length; i++) c[tiles[i]]++;
    return c;
  }

  /* ---------- the card ---------- */
  var CARD = [
    /* ---- 2026 (the year hands; Z is the soap, read as 0) ---- */
    {
      id: 'y1', cat: '2026', value: 30,
      label: 'FF  2026  2026  2026', note: 'three suits · no jokers possible',
      g: [[2, 'F'],
      [2, 'A2'], [1, 'Z'], [1, 'A6'],
      [2, 'B2'], [1, 'Z'], [1, 'B6'],
      [2, 'C2'], [1, 'Z'], [1, 'C6']]
    },
    {
      id: 'y2', cat: '2026', value: 25,
      label: '2222  0000  2222  66', note: 'two suits for the 2s',
      g: [[4, 'A2'], [4, 'Z'], [4, 'B2'], [2, 'C6']]
    },
    {
      id: 'y3', cat: '2026', value: 25,
      label: 'FFFF  222  000  2222', note: 'two suits',
      g: [[4, 'F'], [3, 'A2'], [3, 'Z'], [4, 'B2']]
    },

    /* ---- 2468 ---- */
    {
      id: 'e1', cat: '2468', value: 25,
      label: 'FF  2222  4444  6666', note: 'any one suit',
      g: [[2, 'F'], [4, 'A2'], [4, 'A4'], [4, 'A6']]
    },
    {
      id: 'e2', cat: '2468', value: 25,
      label: 'FF  222  444  666  888', note: 'any one suit',
      g: [[2, 'F'], [3, 'A2'], [3, 'A4'], [3, 'A6'], [3, 'A8']]
    },
    {
      id: 'e3', cat: '2468', value: 25,
      label: '2222  4444  66  88', note: 'two suits',
      g: [[4, 'A2'], [4, 'A4'], [4, 'B6'], [2, 'B8']]
    },
    {
      id: 'e4', cat: '2468', value: 40, concealed: true,
      label: '2468  2468  2468  FF', note: 'three suits · all singles · concealed',
      g: [[1, 'A2'], [1, 'A4'], [1, 'A6'], [1, 'A8'],
      [1, 'B2'], [1, 'B4'], [1, 'B6'], [1, 'B8'],
      [1, 'C2'], [1, 'C4'], [1, 'C6'], [1, 'C8'], [2, 'F']]
    },

    /* ---- Like Numbers (the same number across suits) ---- */
    {
      id: 'l1', cat: 'Like Numbers', value: 25,
      label: 'FF  1111  1111  1111', note: 'any one number, three suits',
      g: [[2, 'F'], [4, 'A+0'], [4, 'B+0'], [4, 'C+0']]
    },
    {
      id: 'l2', cat: 'Like Numbers', value: 30,
      label: '111  111  111  DDD  DD', note: 'one number in three suits + dragons',
      g: [[3, 'A+0'], [3, 'B+0'], [3, 'C+0'], [3, 'dA'], [2, 'dB']]
    },
    {
      id: 'l3', cat: 'Like Numbers', value: 35, concealed: true,
      label: '11  11  11  DDD  DDD  DD', note: 'concealed',
      g: [[2, 'A+0'], [2, 'B+0'], [2, 'C+0'], [3, 'dA'], [3, 'dB'], [2, 'dC']]
    },

    /* ---- Consecutive Run ---- */
    {
      id: 'c1', cat: 'Consecutive Run', value: 25,
      label: 'FF  1111  2222  3333', note: 'any three consecutive, one suit',
      g: [[2, 'F'], [4, 'A+0'], [4, 'A+1'], [4, 'A+2']]
    },
    {
      id: 'c2', cat: 'Consecutive Run', value: 25,
      label: '111  222  333  444  55', note: 'any five consecutive, one suit',
      g: [[3, 'A+0'], [3, 'A+1'], [3, 'A+2'], [3, 'A+3'], [2, 'A+4']]
    },
    {
      id: 'c3', cat: 'Consecutive Run', value: 50, concealed: true,
      label: '11 22 33 44 55 66 77', note: 'seven consecutive pairs, one suit · concealed',
      g: [[2, 'A+0'], [2, 'A+1'], [2, 'A+2'], [2, 'A+3'], [2, 'A+4'], [2, 'A+5'], [2, 'A+6']]
    },
    {
      id: 'c4', cat: 'Consecutive Run', value: 30,
      label: '111  222  333  444  55', note: 'spread across three suits',
      g: [[3, 'A+0'], [3, 'A+1'], [3, 'B+2'], [3, 'B+3'], [2, 'C+4']]
    },

    /* ---- 13579 ---- */
    {
      id: 'o1', cat: '13579', value: 25,
      label: 'FF  1111  3333  5555', note: 'any one suit',
      g: [[2, 'F'], [4, 'A1'], [4, 'A3'], [4, 'A5']]
    },
    {
      id: 'o2', cat: '13579', value: 30,
      label: '111  333  555  777  99', note: 'any one suit',
      g: [[3, 'A1'], [3, 'A3'], [3, 'A5'], [3, 'A7'], [2, 'A9']]
    },
    {
      id: 'o3', cat: '13579', value: 50, concealed: true,
      label: '11 33 55 77 99  DD  DD', note: 'one suit + two dragon pairs · concealed',
      g: [[2, 'A1'], [2, 'A3'], [2, 'A5'], [2, 'A7'], [2, 'A9'], [2, 'dB'], [2, 'dC']]
    },
    {
      id: 'o4', cat: '13579', value: 40,
      label: '13579  13579  FFFF', note: 'two suits · singles',
      g: [[1, 'A1'], [1, 'A3'], [1, 'A5'], [1, 'A7'], [1, 'A9'],
      [1, 'B1'], [1, 'B3'], [1, 'B5'], [1, 'B7'], [1, 'B9'], [4, 'F']]
    },

    /* ---- Winds & Dragons ---- */
    {
      id: 'w1', cat: 'Winds & Dragons', value: 25,
      label: 'NNNN  EEEE  WWWW  SS', note: '',
      g: [[4, 'N'], [4, 'E'], [4, 'W'], [2, 'S']]
    },
    {
      id: 'w2', cat: 'Winds & Dragons', value: 30,
      label: 'NNN  EEE  WWW  SSS  FF', note: 'all four winds',
      g: [[3, 'N'], [3, 'E'], [3, 'W'], [3, 'S'], [2, 'F']]
    },
    {
      id: 'w3', cat: 'Winds & Dragons', value: 30,
      label: 'NN  EEE  WWW  SSS  DDD', note: 'one dragon pung',
      g: [[2, 'N'], [3, 'E'], [3, 'W'], [3, 'S'], [3, 'dA']]
    },
    {
      id: 'w4', cat: 'Winds & Dragons', value: 35,
      label: 'DDDD  DDDD  DDDD  FF', note: 'all three dragons',
      g: [[4, 'dA'], [4, 'dB'], [4, 'dC'], [2, 'F']]
    },
    {
      id: 'w5', cat: 'Winds & Dragons', value: 30,
      label: 'NNNN  SSSS  DDD  DDD', note: 'two dragons',
      g: [[4, 'N'], [4, 'S'], [3, 'dA'], [3, 'dB']]
    },

    /* ---- 369 ---- */
    {
      id: 't1', cat: '369', value: 25,
      label: 'FF  3333  6666  9999', note: 'any one suit',
      g: [[2, 'F'], [4, 'A3'], [4, 'A6'], [4, 'A9']]
    },
    {
      id: 't2', cat: '369', value: 30,
      label: '333  666  999  333  66', note: 'two suits',
      g: [[3, 'A3'], [3, 'A6'], [3, 'A9'], [3, 'B3'], [2, 'B6']]
    },
    {
      id: 't3', cat: '369', value: 45, concealed: true,
      label: '33 66 99  33 66 99  FF', note: 'two suits · all pairs · concealed',
      g: [[2, 'A3'], [2, 'A6'], [2, 'A9'], [2, 'B3'], [2, 'B6'], [2, 'B9'], [2, 'F']]
    },

    /* ---- Quints (always need jokers) ---- */
    {
      id: 'q1', cat: 'Quints', value: 40,
      label: '11111  22222  3333', note: 'consecutive, one suit',
      g: [[5, 'A+0'], [5, 'A+1'], [4, 'A+2']]
    },
    {
      id: 'q2', cat: 'Quints', value: 40,
      label: 'FFFFF  11111  1111', note: 'one number, two suits',
      g: [[5, 'F'], [5, 'A+0'], [4, 'B+0']]
    },
    {
      id: 'q3', cat: 'Quints', value: 40,
      label: 'NNNNN  SSSSS  1111', note: '',
      g: [[5, 'N'], [5, 'S'], [4, 'A+0']]
    },
    {
      id: 'q4', cat: 'Quints', value: 35,
      label: '88888  6666  444  22', note: 'one suit',
      g: [[5, 'A8'], [4, 'A6'], [3, 'A4'], [2, 'A2']]
    },

    /* ---- Singles & Pairs (never any jokers) ---- */
    {
      id: 's1', cat: 'Singles & Pairs', value: 50, concealed: true,
      label: '11 22 33  11 22 33  DD', note: 'consecutive, two suits · concealed',
      g: [[2, 'A+0'], [2, 'A+1'], [2, 'A+2'], [2, 'B+0'], [2, 'B+1'], [2, 'B+2'], [2, 'dC']]
    },
    {
      id: 's2', cat: 'Singles & Pairs', value: 35,
      label: 'N E W S  1111  1111  FF', note: 'one number, two suits',
      g: [[1, 'N'], [1, 'E'], [1, 'W'], [1, 'S'], [4, 'A+0'], [4, 'B+0'], [2, 'F']]
    }
  ];

  /* ---------- spec resolution ---------- */

  /** Which suit variables (A/B/C) does this hand use? */
  function suitVarsOf(hand) {
    var seen = {};
    hand.g.forEach(function (grp) {
      var s = grp[1];
      if (s[0] === 'd') seen[s[1]] = true;
      else if (s[0] >= 'A' && s[0] <= 'C') seen[s[0]] = true;
    });
    return Object.keys(seen).sort();
  }

  /** Largest +offset used, so we know the legal range of n. */
  function maxOffsetOf(hand) {
    var max = -1;
    hand.g.forEach(function (grp) {
      var s = grp[1];
      var p = s.indexOf('+');
      if (p >= 0) max = Math.max(max, +s.slice(p + 1));
    });
    return max;
  }

  function resolve(spec, assign, n) {
    if (spec === 'F') return T.FLOWER;
    if (spec === 'Z') return SOAP;
    if (WIND[spec] !== undefined && spec.length === 1) return WIND[spec];
    if (spec[0] === 'd') return T.SUIT_DRAGON[assign[spec[1]]];
    var suit = assign[spec[0]];
    var p = spec.indexOf('+');
    var rank = p >= 0 ? n + (+spec.slice(p + 1)) : +spec.slice(1);
    if (rank < 1 || rank > 9) return -1;
    return T.idx(suit, rank);
  }

  /** Every injective assignment of the used suit variables to real suits. */
  function assignments(vars) {
    var out = [];
    function rec(i, used, cur) {
      if (i >= vars.length) { out.push(Object.assign({}, cur)); return; }
      for (var s = 0; s < 3; s++) {
        if (used[s]) continue;
        used[s] = 1; cur[vars[i]] = SUITS[s];
        rec(i + 1, used, cur);
        used[s] = 0; delete cur[vars[i]];
      }
    }
    rec(0, [0, 0, 0], {});
    return out.length ? out : [{}];
  }

  // Cache the static per-hand analysis.
  CARD.forEach(function (h) {
    h.vars = suitVarsOf(h);
    h.maxOff = maxOffsetOf(h);
    h.assigns = assignments(h.vars);
    h.size = h.g.reduce(function (n, grp) { return n + grp[0]; }, 0);
  });

  /**
   * Score one concrete interpretation of a hand.
   * Returns {missing, need:{tile:count}, jokersUsed, canUseJoker}.
   *
   * Groups are filled smallest-first: singles and pairs cannot take a
   * joker, so they must get first claim on the real tiles.
   */
  function tryOne(hand, cnt, assign, n) {
    var groups = [];
    for (var i = 0; i < hand.g.length; i++) {
      var t = resolve(hand.g[i][1], assign, n);
      if (t < 0) return null;
      groups.push({ c: hand.g[i][0], t: t });
    }
    groups.sort(function (a, b) { return a.c - b.c; });

    var avail = cnt.slice();
    var jokers = avail[T.JOKER] || 0;
    var hardShort = 0, jokerShort = 0, need = {};

    for (var k = 0; k < groups.length; k++) {
      var g = groups[k];
      var take = Math.min(g.c, avail[g.t] || 0);
      avail[g.t] -= take;
      var short = g.c - take;
      if (short > 0) {
        if (g.c >= 3) jokerShort += short; else hardShort += short;
        need[g.t] = (need[g.t] || 0) + short;
      }
    }
    var useJ = Math.min(jokers, jokerShort);
    return {
      missing: hardShort + (jokerShort - useJ),
      need: need,
      jokersUsed: useJ,
      canUseJoker: jokerShort > useJ,
      assign: assign, n: n
    };
  }

  /** Best interpretation of one card hand for these tiles. */
  function matchHand(hand, cnt) {
    var best = null;
    var nLo = 1, nHi = 1;
    if (hand.maxOff >= 0) { nLo = 1; nHi = 9 - hand.maxOff; }
    for (var a = 0; a < hand.assigns.length; a++) {
      for (var n = nLo; n <= nHi; n++) {
        var r = tryOne(hand, cnt, hand.assigns[a], n);
        if (r && (!best || r.missing < best.missing)) {
          best = r;
          if (best.missing === 0) return best;
        }
      }
    }
    return best;
  }

  /**
   * Rank every card hand for these tiles, closest first.
   * `only` optionally restricts to one hand id (once a player has
   * committed by making an exposure).
   */
  function rank(cnt, only) {
    var out = [];
    for (var i = 0; i < CARD.length; i++) {
      if (only && CARD[i].id !== only) continue;
      var m = matchHand(CARD[i], cnt);
      if (m) out.push({ hand: CARD[i], missing: m.missing, detail: m });
    }
    out.sort(function (a, b) {
      if (a.missing !== b.missing) return a.missing - b.missing;
      return b.hand.value - a.hand.value;    // prefer the richer of two equals
    });
    return out;
  }

  /** Is this a completed hand? Returns the winning entry or null. */
  function isMahjong(cnt, only) {
    if (cnt.reduce(function (a, b) { return a + b; }, 0) !== 14) return null;
    var r = rank(cnt, only);
    return r.length && r[0].missing === 0 ? r[0] : null;
  }

  /** Tiles that would move this hand forward, with how many hands each helps. */
  function helpfulTiles(cnt, only, depth) {
    var top = rank(cnt, only).slice(0, depth || 6);
    var score = {};
    top.forEach(function (e) {
      Object.keys(e.detail.need).forEach(function (t) {
        score[t] = (score[t] || 0) + 1;
      });
      if (e.detail.canUseJoker) score[T.JOKER] = (score[T.JOKER] || 0) + 1;
    });
    return score;
  }

  /**
   * Which tile should be discarded? Tries each candidate and keeps the one
   * leaving the best (lowest) distance, breaking ties by how many card hands
   * remain within reach — flexibility is worth a lot in American play.
   */
  function rateDiscards(cnt, only) {
    var results = [];
    for (var t = 0; t < 36; t++) {
      if (!cnt[t]) continue;
      if (t === T.JOKER) continue;      // never throw a joker away
      cnt[t]--;
      var r = rank(cnt, only);
      var best = r.length ? r[0].missing : 99;
      var alive = r.filter(function (e) { return e.missing <= best + 1; }).length;
      var value = r.length ? r[0].hand.value : 0;
      cnt[t]++;
      results.push({ tile: t, missing: best, alive: alive, value: value, top: r[0] });
    }
    results.sort(function (a, b) {
      if (a.missing !== b.missing) return a.missing - b.missing;
      if (a.alive !== b.alive) return b.alive - a.alive;
      return b.value - a.value;
    });
    return results;
  }

  var CATEGORIES = [];
  CARD.forEach(function (h) { if (CATEGORIES.indexOf(h.cat) < 0) CATEGORIES.push(h.cat); });

  /** A representative tile layout for display: A=Craks, B=Bams, C=Dots, n=1. */
  function previewTiles(hand) {
    var vars = hand.vars, assign = {};
    var pool = ['m', 's', 'p'];
    vars.forEach(function (v, i) { assign[v] = pool[i]; });
    var n = 1;
    var out = [];
    hand.g.forEach(function (grp) {
      var t = resolve(grp[1], assign, n);
      out.push({ count: grp[0], tile: t < 0 ? T.FLOWER : t });
    });
    return out;
  }

  global.AmCard = {
    CARD: CARD, CATEGORIES: CATEGORIES, SOAP: SOAP,
    counts36: counts36, matchHand: matchHand, rank: rank,
    isMahjong: isMahjong, helpfulTiles: helpfulTiles, rateDiscards: rateDiscards,
    previewTiles: previewTiles, resolve: resolve
  };
})(window);
