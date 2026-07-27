/* ============================================================
   app.js — boot, home screen, settings, wiring
   ============================================================ */
(function (global) {
  'use strict';

  var el = UI.el;

  var TIPS = [
    'Middle tiles connect in more directions than terminals. A 5 lives in three runs; a 1 lives in one.',
    'Count the discards. Waiting on a tile that is already all gone is the most common beginner mistake.',
    'A two-sided wait sees eight tiles. A pair wait sees two. Choose accordingly.',
    'Claiming a discard opens your hand forever. Only do it if it genuinely speeds you up.',
    'Chows can only be claimed from the player immediately before you. Pungs come from anyone.',
    'Honour tiles cannot form runs — so a lone wind is usually your first discard.',
    'Win first, optimise later. A cheap hand you finish beats a beautiful one you do not.',
    'Priority when two players call the same tile: win beats kong beats pung beats chow.',
    'If your tiles are already leaning towards one suit, a flush may be closer than you think.',
    'Concealed sets score double. Patience genuinely pays here.'
  ];

  function refreshHome() {
    var d = Store.data;
    var lp = Store.levelProgress();

    UI.$('#hdr-level').textContent = 'Lv ' + Store.level();
    UI.$('#hdr-xp').style.width = lp.pct + '%';
    UI.$('#hdr-streak').innerHTML = d.streak.count > 1 ? '🔥 ' + d.streak.count : '';

    var lessonsDone = Store.lessonsDoneCount();
    UI.$('#home-stats').innerHTML =
      stat(lessonsDone + '/' + LESSONS.length, 'lessons') +
      stat(d.games.won + '/' + d.games.played, 'games won') +
      stat(d.badges.length + '/' + Store.BADGES.length, 'badges') +
      stat(d.xp, 'total XP');

    // Next thing to do
    var nextLesson = LESSONS.filter(function (L) {
      return !(d.lessons[L.id] && d.lessons[L.id].done);
    })[0];

    var cta = UI.$('#home-cta');
    cta.innerHTML = '';
    if (nextLesson) {
      var b = el('button', 'cta');
      b.type = 'button';
      b.innerHTML = '<span class="cta-k">' + (lessonsDone ? 'Next lesson' : 'Start here') + '</span>' +
        '<span class="cta-t">' + nextLesson.icon + ' ' + nextLesson.title + '</span>' +
        '<span class="cta-s">' + nextLesson.sub + '</span>';
      b.addEventListener('click', function () { UI.sound('click'); Learn.start(nextLesson); });
      cta.appendChild(b);
    } else {
      var b2 = el('button', 'cta');
      b2.type = 'button';
      b2.innerHTML = '<span class="cta-k">You have learned it all</span>' +
        '<span class="cta-t">🀄 Play a hand</span>' +
        '<span class="cta-s">Three opponents, Coach optional</span>';
      b2.addEventListener('click', function () { UI.sound('click'); Play.newGame(); });
      cta.appendChild(b2);
    }

    UI.$('#home-tip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  function stat(v, l) {
    return '<div class="stat"><b>' + v + '</b><span>' + l + '</span></div>';
  }

  /* ---------------- settings ---------------- */
  function openSettings() {
    var s = Store.settings();
    var body = el('div', 'settings');

    body.appendChild(toggle('Tile labels', 'Show a small name tag on every tile. Turn it off once you know them.',
      s.labels, function (v) { s.labels = v; Store.save(); applySettings(); }));
    body.appendChild(toggle('Coach', 'Show your shanten, waits, and a suggested discard during play.',
      s.coach, function (v) { s.coach = v; Store.save(); }));
    body.appendChild(toggle('Sound', 'Little blips on taps and wins.',
      s.sound, function (v) { s.sound = v; Store.save(); }));

    var diff = el('div', 'set-row col');
    diff.innerHTML = '<div class="set-l"><b>Opponents</b><span>How sharply the AI plays.</span></div>';
    var seg = el('div', 'segbar sm');
    [['gentle', 'Gentle'], ['standard', 'Standard'], ['sharp', 'Sharp']].forEach(function (d) {
      var b = el('button', 'seg' + (s.difficulty === d[0] ? ' on' : ''), d[1]);
      b.type = 'button';
      b.addEventListener('click', function () {
        s.difficulty = d[0]; Store.save();
        UI.$$('.seg', seg).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        UI.sound('tap');
      });
      seg.appendChild(b);
    });
    diff.appendChild(seg);
    body.appendChild(diff);

    var danger = el('button', 'btn danger wide', 'Reset all progress');
    danger.type = 'button';
    danger.addEventListener('click', function () {
      UI.modal({
        title: 'Reset everything?',
        body: '<p>All XP, badges, lesson progress, and best scores will be erased. This cannot be undone.</p>',
        actions: [
          { label: 'Cancel' },
          {
            label: 'Erase it all', cls: 'danger', onClick: function () {
              Store.reset();
              applySettings();
              Learn.renderList(); Drills.renderList(); Reference.render();
              refreshHome();
              UI.screen('home');
              UI.toast('Progress reset');
            }
          }
        ]
      });
    });
    body.appendChild(el('div', 'spacer'));
    body.appendChild(danger);
    body.appendChild(el('p', 'muted small centre', 'Mahjong Dojo · progress is stored on this device only'));

    UI.modal({ title: 'Settings', body: body, actions: [{ label: 'Done', cls: 'primary' }] });
  }

  function toggle(label, sub, value, onChange) {
    var row = el('div', 'set-row');
    row.innerHTML = '<div class="set-l"><b>' + label + '</b><span>' + sub + '</span></div>';
    var sw = el('button', 'switch' + (value ? ' on' : ''));
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(!!value));
    sw.innerHTML = '<i></i>';
    sw.addEventListener('click', function () {
      value = !value;
      sw.classList.toggle('on', value);
      sw.setAttribute('aria-checked', String(value));
      UI.sound('tap');
      onChange(value);
    });
    row.appendChild(sw);
    return row;
  }

  function applySettings() {
    document.body.classList.toggle('labels', !!Store.settings().labels);
  }

  /* ---------------- wiring ---------------- */
  function bind() {
    UI.$$('#tabbar .tab').forEach(function (t) {
      t.addEventListener('click', function () {
        var go = t.dataset.go;
        UI.sound('tap');
        if (go === 'learn') Learn.renderList();
        if (go === 'drills') Drills.renderList();
        if (go === 'guide') Reference.render();
        if (go === 'play') {
          if (Play.active()) { UI.screen('play', { immersive: true }); return; }
          return startPlayPrompt();
        }
        if (go === 'home') refreshHome();
        UI.screen(go);
      });
    });

    UI.$('#btn-settings').addEventListener('click', function () { UI.sound('tap'); openSettings(); });
    UI.$('#lesson-quit').addEventListener('click', Learn.quit);
    UI.$('#drill-quit').addEventListener('click', Drills.quit);
    UI.$('#play-quit').addEventListener('click', Play.quit);
    UI.$('#coach-toggle').addEventListener('click', Play.toggleCoach);
    UI.$('#home-play').addEventListener('click', function () { UI.sound('click'); startPlayPrompt(); });

    UI.setLeaveHandler('drill', Drills.stop);

    // Keep the browser back button from leaving the app mid-lesson.
    global.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var cur = UI.$('.screen.active');
        if (!cur) return;
        if (cur.id === 'screen-lesson') Learn.quit();
        else if (cur.id === 'screen-drill') Drills.quit();
        else if (cur.id === 'screen-play') Play.quit();
      }
    });
  }

  function startPlayPrompt() {
    if (Play.active()) {
      return UI.modal({
        title: 'Game in progress',
        body: '<p>You already have a hand going.</p>',
        actions: [
          { label: 'Resume', cls: 'primary', onClick: function () { UI.screen('play', { immersive: true }); } },
          { label: 'New hand', onClick: function () { Play.newGame(); } }
        ]
      });
    }
    var s = Store.settings();
    UI.modal({
      title: 'Play a hand',
      body: '<p>You versus three opponents. Draw, discard, claim what helps, and call Mahjong when you get there.</p>' +
        '<p class="muted small">Coach is currently <strong>' + (s.coach ? 'on' : 'off') + '</strong> and opponents are set to <strong>' +
        s.difficulty + '</strong>. Change either in Settings.</p>',
      actions: [
        { label: 'Not now' },
        { label: 'Deal', cls: 'primary', onClick: function () { Play.newGame(); } }
      ]
    });
  }

  function boot() {
    Store.load();
    applySettings();
    bind();
    Learn.renderList();
    Drills.renderList();
    Reference.render();
    refreshHome();
    UI.screen('home');
    document.getElementById('splash').classList.add('gone');
    setTimeout(function () {
      var sp = document.getElementById('splash');
      if (sp) sp.remove();
    }, 600);
  }

  global.App = { boot: boot, refreshHome: refreshHome, openSettings: openSettings };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
