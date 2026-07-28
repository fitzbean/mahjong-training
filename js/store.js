/* ============================================================
   store.js — progress, XP, badges, settings (localStorage)
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'mahjong-dojo-v1';

  var DEFAULTS = {
    xp: 0,
    lessons: {},        // id -> {done:true, stars:0-3}
    drills: {},         // id -> {best:0, plays:0}
    games: { played: 0, won: 0, bestScore: 0 },
    badges: [],
    streak: { count: 0, last: null },
    settings: { labels: true, coach: true, sound: true, difficulty: 'standard' }
  };

  var BADGES = [
    { id: 'first-lesson', name: 'First Steps', icon: '🌱', desc: 'Finish your first lesson' },
    { id: 'scholar', name: 'Scholar', icon: '📜', desc: 'Finish every lesson' },
    { id: 'sharp-eye', name: 'Sharp Eye', icon: '👁️', desc: 'Score 25+ in Tile Rush' },
    { id: 'snap', name: 'Snap Judgement', icon: '⚡', desc: 'Hit a 15 streak in Set Snap' },
    { id: 'tactician', name: 'Tactician', icon: '🧠', desc: 'Score 10+ in Discard Master' },
    { id: 'radar', name: 'Radar', icon: '📡', desc: 'Score 10+ in Ready Check' },
    { id: 'first-win', name: 'First Blood', icon: '🥇', desc: 'Win your first game' },
    { id: 'self-made', name: 'Self-Made', icon: '🎴', desc: 'Win by self-draw' },
    { id: 'closed-book', name: 'Closed Book', icon: '🔒', desc: 'Win with a concealed hand' },
    { id: 'purist', name: 'Purist', icon: '💎', desc: 'Win a flush hand' },
    { id: 'big-hand', name: 'Big Hand', icon: '🐉', desc: 'Win a hand worth 500+' },
    { id: 'regular', name: 'Regular', icon: '🔥', desc: 'Play on 3 different days' },
    { id: 'card-shark', name: 'Card Shark', icon: '🃏', desc: 'Win an American hand' },
    { id: 'joker-wild', name: 'Joker\'s Wild', icon: '🎭', desc: 'Win a Quints hand' },
    { id: 'globetrotter', name: 'Globetrotter', icon: '🗺️', desc: 'Finish both lesson tracks' }
  ];

  var LEVELS = [0, 60, 160, 320, 550, 860, 1260, 1760, 2380, 3140, 4060];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(base, over) {
    var out = clone(base);
    Object.keys(over || {}).forEach(function (k) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k]) {
        out[k] = merge(base[k], over[k]);
      } else if (over[k] !== undefined) {
        out[k] = over[k];
      }
    });
    return out;
  }

  var data = clone(DEFAULTS);

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) data = merge(DEFAULTS, JSON.parse(raw));
    } catch (e) { /* private mode / corrupt data — start fresh */ }
    touchStreak();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { }
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function touchStreak() {
    var t = today();
    if (data.streak.last === t) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yStr = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    data.streak.count = data.streak.last === yStr ? data.streak.count + 1 : 1;
    data.streak.last = t;
    data.streak.days = (data.streak.days || 0) + 1;
    if (data.streak.days >= 3) award('regular');
    save();
  }

  function level() {
    var l = 0;
    for (var i = 0; i < LEVELS.length; i++) if (data.xp >= LEVELS[i]) l = i;
    return l + 1;
  }
  function levelProgress() {
    var l = level() - 1;
    var lo = LEVELS[l] || 0;
    var hi = LEVELS[l + 1];
    if (hi === undefined) return { pct: 100, cur: data.xp - lo, need: 0, max: true };
    return { pct: Math.round(((data.xp - lo) / (hi - lo)) * 100), cur: data.xp - lo, need: hi - lo, max: false };
  }

  var pending = [];
  function addXP(n) {
    var before = level();
    data.xp += n;
    save();
    if (level() > before) pending.push({ type: 'level', level: level() });
    return n;
  }

  function award(id) {
    if (data.badges.indexOf(id) >= 0) return false;
    var b = BADGES.filter(function (x) { return x.id === id; })[0];
    if (!b) return false;
    data.badges.push(id);
    save();
    pending.push({ type: 'badge', badge: b });
    return true;
  }

  function takePending() { var p = pending; pending = []; return p; }

  function lessonDone(id, stars) {
    var cur = data.lessons[id] || { done: false, stars: 0 };
    var isNew = !cur.done;
    cur.done = true;
    cur.stars = Math.max(cur.stars, stars || 0);
    data.lessons[id] = cur;
    save();
    award('first-lesson');
    if (trackDone(LESSONS)) award('scholar');
    if (trackDone(LESSONS) && trackDone(AM_LESSONS)) award('globetrotter');
    return isNew;
  }

  function trackDone(track) {
    return track.every(function (l) { return data.lessons[l.id] && data.lessons[l.id].done; });
  }

  function lessonsDoneCount(track) {
    var list = track || ALL_LESSONS;
    return list.filter(function (l) { return data.lessons[l.id] && data.lessons[l.id].done; }).length;
  }

  function drillResult(id, score) {
    var cur = data.drills[id] || { best: 0, plays: 0 };
    cur.plays++;
    var isBest = score > cur.best;
    cur.best = Math.max(cur.best, score);
    data.drills[id] = cur;
    save();
    return isBest;
  }

  function reset() {
    data = clone(DEFAULTS);
    save();
    touchStreak();
  }

  global.Store = {
    get data() { return data; },
    BADGES: BADGES,
    load: load, save: save, addXP: addXP, award: award, takePending: takePending,
    level: level, levelProgress: levelProgress,
    lessonDone: lessonDone, lessonsDoneCount: lessonsDoneCount, trackDone: trackDone,
    drillResult: drillResult, reset: reset,
    settings: function () { return data.settings; }
  };
})(window);
