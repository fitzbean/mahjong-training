/* ============================================================
   tiles.js — tile identity + SVG faces
   Tiles are integers 0..33:
     0-8   m1..m9   Characters (萬)
     9-17  p1..p9   Dots (筒)
     18-26 s1..s9   Bamboo (索)
     27-33 z1..z7   E, S, W, N, White, Green, Red
   ============================================================ */
(function (global) {
  'use strict';

  var SUIT_NAMES = { m: 'Characters', p: 'Dots', s: 'Bamboo' };
  var HONOR_NAMES = ['East Wind', 'South Wind', 'West Wind', 'North Wind',
    'White Dragon', 'Green Dragon', 'Red Dragon'];
  var HONOR_SHORT = ['E', 'S', 'W', 'N', 'Wh', 'Gr', 'Rd'];
  var CJK = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  function suitOf(i) { return i < 9 ? 'm' : i < 18 ? 'p' : i < 27 ? 's' : 'z'; }
  function rankOf(i) { return i < 27 ? (i % 9) + 1 : i - 26; }
  function idx(suit, rank) {
    return suit === 'm' ? rank - 1 : suit === 'p' ? 8 + rank : suit === 's' ? 17 + rank : 26 + rank;
  }
  function isHonor(i) { return i >= 27; }
  function isWind(i) { return i >= 27 && i <= 30; }
  function isDragon(i) { return i >= 31; }
  function isTerminal(i) { return i < 27 && (rankOf(i) === 1 || rankOf(i) === 9); }
  function isSimple(i) { return i < 27 && !isTerminal(i); }
  /** Terminals and honors — the "edge" tiles that score more but connect less. */
  function isMajor(i) { return isHonor(i) || isTerminal(i); }

  function name(i) {
    if (i >= 27) return HONOR_NAMES[i - 27];
    return rankOf(i) + ' ' + SUIT_NAMES[suitOf(i)];
  }
  function short(i) {
    if (i >= 27) return HONOR_SHORT[i - 27];
    return rankOf(i) + suitOf(i).toUpperCase();
  }

  /* ---------- palette ---------- */
  var C = {
    ink: '#1d2b45',
    red: '#c0392b',
    green: '#1f7a4d',
    blue: '#1f4e9c',
    gold: '#a9812c'
  };

  /* ---------- Dots ---------- */
  // [x, y, colour] laid out on a 60x84 face
  var DOT = {
    1: [[30, 42, 'x']],
    2: [[30, 28, 'green'], [30, 56, 'blue']],
    3: [[17, 24, 'blue'], [30, 42, 'red'], [43, 60, 'green']],
    4: [[20, 28, 'blue'], [40, 28, 'green'], [20, 56, 'green'], [40, 56, 'blue']],
    5: [[19, 26, 'blue'], [41, 26, 'green'], [30, 42, 'red'], [19, 58, 'green'], [41, 58, 'blue']],
    6: [[20, 24, 'green'], [40, 24, 'green'], [20, 42, 'red'], [40, 42, 'red'], [20, 60, 'red'], [40, 60, 'red']],
    7: [[16, 20, 'green'], [27, 27, 'green'], [38, 34, 'green'],
    [20, 52, 'red'], [40, 52, 'red'], [20, 66, 'red'], [40, 66, 'red']],
    8: [[20, 20, 'blue'], [40, 20, 'blue'], [20, 35, 'blue'], [40, 35, 'blue'],
    [20, 50, 'blue'], [40, 50, 'blue'], [20, 65, 'blue'], [40, 65, 'blue']],
    9: [[16, 24, 'blue'], [30, 24, 'blue'], [44, 24, 'blue'],
    [16, 42, 'red'], [30, 42, 'red'], [44, 42, 'red'],
    [16, 60, 'green'], [30, 60, 'green'], [44, 60, 'green']]
  };
  var DOT_R = { 1: 0, 2: 9, 3: 8.5, 4: 9, 5: 8, 6: 7.5, 7: 6.6, 8: 6.4, 9: 6.6 };

  function circleDot(x, y, r, col) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + col + '"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.55) + '" fill="rgba(255,255,255,.75)"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.24) + '" fill="' + col + '"/>';
  }

  function faceDots(n) {
    if (n === 1) {
      return '<circle cx="30" cy="42" r="17" fill="' + C.blue + '"/>' +
        '<circle cx="30" cy="42" r="13" fill="#f7f2e4"/>' +
        '<circle cx="30" cy="42" r="9.5" fill="' + C.red + '"/>' +
        '<circle cx="30" cy="42" r="5" fill="#f7f2e4"/>' +
        '<circle cx="30" cy="42" r="2.4" fill="' + C.blue + '"/>';
    }
    return DOT[n].map(function (d) {
      return circleDot(d[0], d[1], DOT_R[n], C[d[2]]);
    }).join('');
  }

  /* ---------- Bamboo ---------- */
  function stick(x, y, h, col, w) {
    w = w || 7;
    var hw = w / 2, top = y - h / 2;
    // A stalk with two node bands — reads as bamboo even at 20px wide.
    return '<g>' +
      '<rect x="' + (x - hw) + '" y="' + top + '" width="' + w + '" height="' + h +
      '" rx="' + (w * 0.34) + '" fill="' + col + '"/>' +
      '<rect x="' + (x - hw) + '" y="' + (top + h * 0.31) + '" width="' + w + '" height="' + (h * 0.09) +
      '" fill="rgba(255,255,255,.72)"/>' +
      '<rect x="' + (x - hw) + '" y="' + (top + h * 0.62) + '" width="' + w + '" height="' + (h * 0.09) +
      '" fill="rgba(255,255,255,.72)"/>' +
      '</g>';
  }

  // [x, y, height, colour]
  var BAM = {
    2: [[30, 26, 24, 'green'], [30, 58, 24, 'green']],
    3: [[30, 24, 22, 'green'], [20, 58, 22, 'green'], [40, 58, 22, 'green']],
    4: [[20, 26, 24, 'green'], [40, 26, 24, 'green'], [20, 58, 24, 'green'], [40, 58, 24, 'green']],
    5: [[18, 25, 21, 'green'], [42, 25, 21, 'green'], [30, 42, 21, 'red'],
    [18, 59, 21, 'green'], [42, 59, 21, 'green']],
    6: [[16, 26, 24, 'green'], [30, 26, 24, 'green'], [44, 26, 24, 'green'],
    [16, 58, 24, 'green'], [30, 58, 24, 'green'], [44, 58, 24, 'green']],
    7: [[30, 18, 17, 'red'],
    [16, 41, 17, 'green'], [30, 41, 17, 'green'], [44, 41, 17, 'green'],
    [16, 63, 17, 'green'], [30, 63, 17, 'green'], [44, 63, 17, 'green']],
    8: [[14, 26, 24, 'green'], [24.7, 26, 24, 'green'], [35.3, 26, 24, 'green'], [46, 26, 24, 'green'],
    [14, 58, 24, 'green'], [24.7, 58, 24, 'green'], [35.3, 58, 24, 'green'], [46, 58, 24, 'green']],
    9: [[16, 22, 17, 'green'], [30, 22, 17, 'green'], [44, 22, 17, 'green'],
    [16, 43, 17, 'red'], [30, 43, 17, 'red'], [44, 43, 17, 'red'],
    [16, 64, 17, 'green'], [30, 64, 17, 'green'], [44, 64, 17, 'green']]
  };

  // Narrower stalks where columns are tight.
  var BAM_W = { 7: 6, 8: 6, 9: 6 };

  function faceBamboo(n) {
    if (n === 1) {
      // 1 Bamboo is traditionally a bird.
      return '<g>' +
        '<path d="M30 66 C18 62 14 50 20 40 C25 31 36 30 41 37 C46 44 43 56 30 66 Z" fill="' + C.green + '"/>' +
        '<path d="M25 44 C29 38 37 38 40 43 C36 50 29 51 25 44 Z" fill="rgba(255,255,255,.5)"/>' +
        '<circle cx="34" cy="26" r="8.5" fill="' + C.green + '"/>' +
        '<circle cx="36" cy="24" r="2.1" fill="#fff"/>' +
        '<circle cx="36.5" cy="24" r="1.1" fill="#12351f"/>' +
        '<path d="M42 27 L50 30 L42 32 Z" fill="' + C.gold + '"/>' +
        '<path d="M30 20 C31 12 37 10 40 14 C36 15 33 17 32 21 Z" fill="' + C.red + '"/>' +
        '<path d="M20 62 C12 68 10 74 14 76 C18 72 24 68 27 66 Z" fill="' + C.red + '"/>' +
        '</g>';
    }
    return BAM[n].map(function (b) { return stick(b[0], b[1], b[2], C[b[3]], BAM_W[n]); }).join('');
  }

  /* ---------- Characters ---------- */
  function faceChar(n) {
    return '<text x="30" y="37" font-size="30" text-anchor="middle" fill="' + C.ink +
      '" font-family="\'Noto Serif JP\',\'Yu Mincho\',\'MS Mincho\',serif" font-weight="600">' + CJK[n] + '</text>' +
      '<text x="30" y="74" font-size="29" text-anchor="middle" fill="' + C.red +
      '" font-family="\'Noto Serif JP\',\'Yu Mincho\',\'MS Mincho\',serif" font-weight="700">萬</text>';
  }

  /* ---------- Honors ---------- */
  function bigGlyph(ch, col) {
    return '<text x="30" y="57" font-size="42" text-anchor="middle" fill="' + col +
      '" font-family="\'Noto Serif JP\',\'Yu Mincho\',\'MS Mincho\',serif" font-weight="700">' + ch + '</text>';
  }
  function faceHonor(r) {
    switch (r) {
      case 1: return bigGlyph('東', C.ink);
      case 2: return bigGlyph('南', C.ink);
      case 3: return bigGlyph('西', C.ink);
      case 4: return bigGlyph('北', C.ink);
      case 5: return '<rect x="12" y="15" width="36" height="54" rx="3" fill="none" stroke="' +
        C.blue + '" stroke-width="3.2"/><rect x="17" y="20" width="26" height="44" rx="2" fill="none" stroke="' +
        C.blue + '" stroke-width="1.1" opacity=".55"/>';
      case 6: return bigGlyph('發', C.green);
      case 7: return bigGlyph('中', C.red);
    }
    return '';
  }

  var faceCache = {};
  /** Inner SVG markup for a tile face, cached. */
  function faceSVG(i) {
    if (faceCache[i]) return faceCache[i];
    var s = suitOf(i), r = rankOf(i), inner;
    if (s === 'm') inner = faceChar(r);
    else if (s === 'p') inner = faceDots(r);
    else if (s === 's') inner = faceBamboo(r);
    else inner = faceHonor(r);
    faceCache[i] = '<svg class="tf" viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg>';
    return faceCache[i];
  }

  /**
   * Build a tile element.
   * opts: {small, back, dim, sel, tag, cls, data}
   */
  function el(i, opts) {
    opts = opts || {};
    var d = document.createElement(opts.button === false ? 'div' : 'button');
    if (d.tagName === 'BUTTON') d.type = 'button';
    d.className = 'tile' + (opts.cls ? ' ' + opts.cls : '');
    if (opts.back) {
      d.classList.add('back');
      d.innerHTML = '<span class="bk"></span>';
      d.setAttribute('aria-label', 'face-down tile');
      return d;
    }
    d.dataset.t = i;
    d.innerHTML = faceSVG(i) + '<span class="tag">' + short(i) + '</span>';
    d.setAttribute('aria-label', name(i));
    if (opts.title !== false) d.title = name(i);
    return d;
  }

  /** Static markup (no events) — handy for innerHTML batches. */
  function html(i, cls) {
    return '<span class="tile ' + (cls || '') + '" data-t="' + i + '" aria-label="' + name(i) + '">' +
      faceSVG(i) + '<span class="tag">' + short(i) + '</span></span>';
  }

  function backHTML(cls) {
    return '<span class="tile back ' + (cls || '') + '"><span class="bk"></span></span>';
  }

  var ALL = [];
  for (var k = 0; k < 34; k++) ALL.push(k);

  global.T = {
    ALL: ALL, SUIT_NAMES: SUIT_NAMES, HONOR_NAMES: HONOR_NAMES, COLORS: C,
    suitOf: suitOf, rankOf: rankOf, idx: idx,
    isHonor: isHonor, isWind: isWind, isDragon: isDragon,
    isTerminal: isTerminal, isSimple: isSimple, isMajor: isMajor,
    name: name, short: short, faceSVG: faceSVG, el: el, html: html, backHTML: backHTML
  };
})(window);
