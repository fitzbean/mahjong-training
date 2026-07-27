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
    ['Exhaustive draw', 'The wall runs out with nobody winning. The hand is void.']
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

  var TABS = [['tiles', 'Tiles'], ['sets', 'Sets'], ['score', 'Scoring'], ['terms', 'Glossary'], ['badges', 'Badges']];

  function tabs() {
    var w = el('div', 'segbar');
    TABS.forEach(function (t) {
      var b = el('button', 'seg' + (t[0] === 'tiles' ? ' on' : ''), t[1]);
      b.type = 'button';
      b.dataset.k = t[0];
      b.addEventListener('click', function () {
        UI.$$('.seg', w).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        UI.sound('tap');
        show(t[0]);
      });
      w.appendChild(b);
    });
    return w;
  }

  function show(key) {
    var p = UI.$('#ref-pane');
    p.innerHTML = '';
    VIEWS[key](p);
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

  VIEWS.terms = function (p) {
    var dl = el('dl', 'gloss');
    GLOSSARY.forEach(function (g) {
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

  global.Reference = { render: render };
})(window);
