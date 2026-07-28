/* ============================================================
   reference.js — tile gallery, glossary, scoring table, badges
   ============================================================ */
(function (global) {
  'use strict';

  var el = UI.el;

  var GLOSSARY = [
    ['Chow', 'Three consecutive numbers in one suit, e.g. 4-5-6 Dots. Claimable only from the player on your left.'],
    ['Pung', 'Three identical tiles. Claimable from anyone.'],
    ['Kong', 'Four identical tiles. Counts as one set and earns you a replacement draw.'],
    ['Pair', 'Two identical tiles. Every winning hand needs exactly one, sometimes called the "eyes".'],
    ['Mahjong', 'The winning call: four sets plus a pair.'],
    ['Tenpai / Ready', 'Your hand needs exactly one more tile to win.'],
    ['Shanten', 'How many tiles away from ready you are. Shanten 0 = ready.'],
    ['Wait', 'The specific tile or tiles that would complete your hand.'],
    ['Outs', 'How many copies of your winning tiles are still unseen.'],
    ['Concealed', 'A hand with no claimed sets. Scores extra — you built it all yourself.'],
    ['Open', 'A hand containing at least one claimed set. Faster, but worth less.'],
    ['Simples', 'Numbered tiles 2 through 8. The easy, flexible ones.'],
    ['Terminals', 'The 1s and 9s. Harder to use, worth more.'],
    ['Honours', 'Winds and dragons. No runs possible, but they score well.'],
    ['Seat wind', 'The wind assigned to your position. A set of it scores a bonus.'],
    ['Round wind', 'The wind of the current round. Same bonus, for everyone.'],
    ['River', 'The row of discards in front of a player.'],
    ['Dead wall', 'The last 14 tiles, reserved for kong replacements. Never drawn normally.'],
    ['Exhaustive draw', 'The wall runs out with nobody winning. The hand is void.'],
    ['— American terms —', ''],
    ['The Card', 'The annual list of legal hands. In American mahjong, if it is not on the card it is not a hand.'],
    ['Charleston', 'The ritual passing of three tiles at a time before play begins.'],
    ['Joker', 'A wildcard. Fills any group of three or more, never a pair or a single.'],
    ['Exposure', 'A claimed set placed face up on your rack. It locks you in.'],
    ['Soap', 'The White Dragon. Its blank face doubles as the digit 0 in year hands.'],
    ['Craks / Bams / Dots', 'American names for Characters, Bamboo, and Dots.'],
    ['Quint', 'Five of the same tile — only possible with jokers.'],
    ['Self-pick', 'Drawing your own winning tile. Everybody pays double.'],
    ['Wall game', 'The American name for an exhaustive draw.'],
    ['Redemption', 'Swapping your real tile for a joker sitting in someone\'s exposure.'],
    ['Dead hand', 'A hand called wrongly, or otherwise illegal. It is out for the round.']
  ];

  var SCORING = [
    ['Pung of simples (2–8)', '2 base', 'Doubled if concealed'],
    ['Pung of terminals or honours', '4 base', 'Doubled if concealed'],
    ['Kong of simples', '8 base', 'Doubled if concealed'],
    ['Kong of terminals or honours', '16 base', 'Doubled if concealed'],
    ['Pair of dragons / your wind', '2 base', ''],
    ['Any chow', '0 base', 'Easy to build, so no reward'],
    ['— Doubles —', '', ''],
    ['Set of any dragon', '×2', 'Always, for anyone'],
    ['Set of your seat or round wind', '×2', 'Both? ×4'],
    ['All Pungs (no chows)', '×4', ''],
    ['All Simples (no 1s, 9s, honours)', '×2', ''],
    ['Half Flush (one suit + honours)', '×4', ''],
    ['Full Flush (one suit only)', '×16', 'The classic big hand'],
    ['All Terminals & Honours', '×16', ''],
    ['Fully Concealed hand', '×2', ''],
    ['Self-Draw', '×2', 'You drew the winning tile yourself'],
    ['Three Concealed Pungs', '×4', ''],
    ['Seven Pairs', '×4', 'Special shape: 7 different pairs'],
    ['Thirteen Orphans', '×8192', 'One of each terminal and honour, plus a pair']
  ];

  function render() {
    var root = UI.$('#ref-body');
    root.innerHTML = '';

    var head = el('div', 'sec-head');
    head.innerHTML = '<h2>Guide</h2><p class="muted">Everything in one place, for when you forget mid-hand.</p>';
    root.appendChild(head);

    root.appendChild(tabs());
    var pane = el('div', 'ref-pane');
    pane.id = 'ref-pane';
    root.appendChild(pane);
    show('tiles');
  }

  var TABS = [['tiles', 'Tiles'], ['sets', 'Sets'], ['score', 'Scoring'],
  ['american', 'American'], ['terms', 'Glossary'], ['badges', 'Badges']];

  function tabs() {
    var w = el('div', 'segbar');
    TABS.forEach(function (t) {
      var b = el('button', 'seg' + (t[0] === 'tiles' ? ' on' : ''), t[1]);
      b.type = 'button';
      b.dataset.k = t[0];
      b.addEventListener('click', function () {
        UI.sound('tap');
        show(t[0]);
      });
      w.appendChild(b);
    });
    return w;
  }

  function show(key) {
    var p = UI.$('#ref-pane');
    if (!p) return;
    UI.$$('#ref-body .seg').forEach(function (b) { b.classList.toggle('on', b.dataset.k === key); });
    p.innerHTML = '';
    VIEWS[key](p);
    p.scrollIntoView({ block: 'nearest' });
  }

  var VIEWS = {};

  VIEWS.tiles = function (p) {
    group(p, 'Characters (萬)', '1 through 9. Chinese numeral on top, 萬 below.', range(0, 9));
    group(p, 'Dots (筒)', 'Count the circles.', range(9, 18));
    group(p, 'Bamboo (索)', 'Count the sticks — except the 1, which is a bird.', range(18, 27));
    group(p, 'Winds', 'East, South, West, North. No runs — pairs and pungs only.', range(27, 31));
    group(p, 'Dragons', 'White (blank frame), Green, Red. A set of any dragon doubles your score.', range(31, 34));
    p.appendChild(el('p', 'muted small pad',
      'There are four copies of every tile above — 136 in total. Some sets add eight flower and season tiles for 144; this app plays without them.'));
  };

  function range(a, b) { var o = []; for (var i = a; i < b; i++) o.push(i); return o; }

  function group(p, title, sub, tiles) {
    p.appendChild(el('h3', 'ref-h', title));
    p.appendChild(el('p', 'muted small', sub));
    var g = el('div', 'gallery');
    tiles.forEach(function (t) {
      var c = el('div', 'gal');
      c.innerHTML = T.html(t) + '<span class="gal-n">' + T.name(t) + '</span>';
      g.appendChild(c);
    });
    p.appendChild(g);
  }

  VIEWS.sets = function (p) {
    var items = [
      ['Pair', tt('7p 7p'), 'Two identical tiles. Exactly one per winning hand.'],
      ['Pung', tt('3s 3s 3s'), 'Three identical tiles. Any tile qualifies.'],
      ['Chow', tt('456m'), 'Three in a row, one suit. Never wraps past 9.'],
      ['Kong', tt('1z 1z 1z 1z'), 'All four copies. One set, plus a replacement draw.']
    ];
    items.forEach(function (it) {
      var b = el('div', 'ref-block');
      b.innerHTML = '<h3 class="ref-h">' + it[0] + '</h3>';
      b.appendChild(UI.tileRow(it[1]));
      b.appendChild(el('p', 'muted small', it[2]));
      p.appendChild(b);
    });

    p.appendChild(el('h3', 'ref-h', 'A complete hand'));
    p.appendChild(el('p', 'muted small', 'Four sets and a pair — fourteen tiles.'));
    p.appendChild(UI.tileRow(tt('123m 456m 789m 111z 55p'), { wide: true, small: true }));

    p.appendChild(el('h3', 'ref-h', 'Wait shapes worth memorising'));
    var waits = [
      ['Two-sided', tt('78s'), 'needs 6 or 9 — 8 tiles. The best wait.'],
      ['Closed gap', tt('5p 7p'), 'needs 6 — 4 tiles.'],
      ['Edge', tt('12m'), 'needs 3 only — 4 tiles.'],
      ['Pair wait', tt('4s 4s'), 'needs the last 4 — 2 tiles. The worst.']
    ];
    waits.forEach(function (w) {
      var b = el('div', 'wait-row');
      b.appendChild(UI.tileRow(w[1], { small: true }));
      b.appendChild(el('span', 'wait-x', '<strong>' + w[0] + '</strong> — ' + w[2]));
      p.appendChild(b);
    });
  };

  VIEWS.score = function (p) {
    p.appendChild(el('p', 'muted small',
      'Your score is base points multiplied by every double you earn. This app uses a simplified Chinese-classical table — house rules vary hugely, so treat it as a sensible default rather than gospel.'));
    var t = el('table', 'sc-table');
    t.innerHTML = SCORING.map(function (r) {
      if (!r[1]) return '<tr class="sc-sep"><td colspan="3">' + r[0].replace(/—/g, '').trim() + '</td></tr>';
      return '<tr><td>' + r[0] + '</td><td class="sc-v">' + r[1] + '</td><td class="sc-n">' + r[2] + '</td></tr>';
    }).join('');
    p.appendChild(t);
  };

  var AM_DIFFS = [
    ['Tiles', '136', '152 — plus 8 flowers and 8 jokers'],
    ['Goal', 'Any 4 sets + a pair', 'One exact hand printed on the card'],
    ['Jokers', 'None', 'Wild in groups of 3+, never in a pair or single'],
    ['Runs (chows)', 'Yes, from your left', 'None at all'],
    ['Claiming', 'Pung from anyone, chow from left', 'Any discard, from anyone, to expose 3+'],
    ['Before play', 'Deal and go', 'The Charleston — passing tiles around'],
    ['Flowers', 'Bonus, replaced', 'Ordinary tiles that hands ask for'],
    ['Scoring', 'Base points × doubles', 'The value printed next to the hand'],
    ['Paying', 'Varies by house', 'Thrower pays double; self-pick, everyone does']
  ];

  VIEWS.american = function (p) {
    p.appendChild(el('div', '', UI.vsBlock({
      tail: 'Everything below follows from that one line.'
    })));

    var warn = el('div', 'tipbox');
    warn.innerHTML = '<span class="tip-k">About this card</span><p>The National Mah Jongg ' +
      'League publishes the official card each year and it is copyrighted. This app uses an ' +
      '<strong>original card</strong> written in the same style, so the skills transfer but no ' +
      'official hand is reproduced. To play for real, buy the current year\'s card.</p>';
    p.appendChild(warn);

    p.appendChild(el('h3', 'ref-h', 'How it differs'));
    var t = el('table', 'sc-table');
    t.innerHTML = '<tr class="sc-sep"><td></td><td>Chinese</td><td>American</td></tr>' +
      AM_DIFFS.map(function (r) {
        return '<tr><td><strong>' + r[0] + '</strong></td><td class="sc-n">' + r[1] +
          '</td><td class="sc-n">' + r[2] + '</td></tr>';
      }).join('');
    p.appendChild(t);

    p.appendChild(el('h3', 'ref-h', 'The two new tiles'));
    var g = el('div', 'gallery');
    [[T.FLOWER, 'Flower', '8 in the set, all interchangeable'],
    [T.JOKER, 'Joker', '8 in the set. Wild in any group of 3+']].forEach(function (x) {
      var c = el('div', 'gal');
      c.innerHTML = T.html(x[0]) + '<span class="gal-n"><strong>' + x[1] + '</strong><br>' + x[2] + '</span>';
      g.appendChild(c);
    });
    p.appendChild(g);

    p.appendChild(el('h3', 'ref-h', 'Suit dragons'));
    p.appendChild(el('p', 'muted small',
      'Each suit is paired with a dragon. When a card line puts "DDD" beside a suit, this is what it means.'));
    [['m', 'Craks (Characters)'], ['s', 'Bams (Bamboo)'], ['p', 'Dots']].forEach(function (s) {
      var row = el('div', 'wait-row');
      row.appendChild(UI.tileRow([T.idx(s[0], 1), T.SUIT_DRAGON[s[0]]], { small: true }));
      row.appendChild(el('span', 'wait-x', '<strong>' + s[1] + '</strong> — ' +
        T.name(T.SUIT_DRAGON[s[0]]) + (s[0] === 'p' ? ' (the "soap", also read as 0)' : '')));
      p.appendChild(row);
    });

    p.appendChild(el('h3', 'ref-h', 'The Charleston'));
    p.appendChild(el('div', 'prose', UI.md(
      'Before anyone draws, everyone passes three tiles at a time.\n\n' +
      '• **First Charleston** — right, across, left\n' +
      '• **Second Charleston** — left, across, right. Optional, and any one player can stop it\n' +
      '• **Courtesy pass** — 0 to 3 tiles with the player across; the smaller number wins\n\n' +
      'Jokers may never be passed.')));
    p.appendChild(el('p', 'muted small',
      'In a physical game the last pass of each Charleston may be "blind" — you pass tiles you ' +
      'have not looked at. On a screen you can always see your tiles, so that rule has nothing ' +
      'to bite on and this app leaves it out.'));

    p.appendChild(el('h3', 'ref-h', 'This app\'s card'));
    p.appendChild(el('p', 'muted small', AmCard.CARD.length + ' hands across ' +
      AmCard.CATEGORIES.length + ' categories. "C" marks a hand that must stay concealed to earn its doubled value.'));

    AmCard.CATEGORIES.forEach(function (cat) {
      p.appendChild(el('h4', 'cat-h', cat));
      var list = el('div', 'cardlist');
      AmCard.CARD.filter(function (h) { return h.cat === cat; }).forEach(function (h) {
        var row = el('div', 'cardrow');
        var tiles = AmCard.previewTiles(h).map(function (grp) {
          var out = '';
          for (var i = 0; i < Math.min(grp.count, 5); i++) out += T.html(grp.tile, 'xs');
          return '<span class="cardgrp">' + out + '</span>';
        }).join('');
        row.innerHTML =
          '<div class="cardrow-h"><span class="cardrow-l">' + h.label + '</span>' +
          '<span class="cardrow-val">' + h.value + (h.concealed ? ' · C' : '') + '</span></div>' +
          '<div class="cardrow-t">' + tiles + '</div>' +
          (h.note ? '<div class="cardrow-n">' + h.note + '</div>' : '');
        list.appendChild(row);
      });
      p.appendChild(list);
    });
    p.appendChild(el('p', 'muted small pad',
      'Tile colours above are only an example — most lines say "any one suit" or "two suits", ' +
      'and you choose which when you commit.'));
  };

  VIEWS.terms = function (p) {
    var dl = el('dl', 'gloss');
    GLOSSARY.forEach(function (g) {
      if (!g[1]) { dl.innerHTML += '<dt class="gloss-sep">' + g[0].replace(/—/g, '').trim() + '</dt>'; return; }
      dl.innerHTML += '<dt>' + g[0] + '</dt><dd>' + g[1] + '</dd>';
    });
    p.appendChild(dl);
  };

  VIEWS.badges = function (p) {
    var have = Store.data.badges;
    p.appendChild(el('p', 'muted small', have.length + ' of ' + Store.BADGES.length + ' earned.'));
    var g = el('div', 'badge-grid');
    Store.BADGES.forEach(function (b) {
      var got = have.indexOf(b.id) >= 0;
      var c = el('div', 'badge' + (got ? ' got' : ''));
      c.innerHTML = '<span class="badge-i">' + (got ? b.icon : '🔒') + '</span>' +
        '<span class="badge-n">' + b.name + '</span>' +
        '<span class="badge-d">' + b.desc + '</span>';
      g.appendChild(c);
    });
    p.appendChild(g);
  };

  global.Reference = { render: render, show: show };
})(window);
