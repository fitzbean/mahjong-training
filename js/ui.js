/* ============================================================
   ui.js — router, markup helpers, modal, toast, sound
   ============================================================ */
(function (global) {
  'use strict';

  var stack = [];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  /* ---------- mini markdown ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function md(text) {
    var lines = String(text).split('\n');
    var out = [], list = null;
    lines.forEach(function (raw) {
      var line = esc(raw.trim());
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
      if (!line) { if (list) { out.push('</ul>'); list = null; } return; }
      if (/^#\s+/.test(line)) {
        if (list) { out.push('</ul>'); list = null; }
        out.push('<h3 class="md-h">' + line.replace(/^#\s+/, '') + '</h3>');
      } else if (/^•\s+/.test(line)) {
        if (!list) { out.push('<ul class="md-ul">'); list = true; }
        out.push('<li>' + line.replace(/^•\s+/, '') + '</li>');
      } else {
        if (list) { out.push('</ul>'); list = null; }
        out.push('<p>' + line + '</p>');
      }
    });
    if (list) out.push('</ul>');
    return out.join('');
  }

  /* ---------- routing ---------- */
  var onLeave = {};

  function screen(id, opts) {
    opts = opts || {};
    var cur = $('.screen.active');
    if (cur) {
      if (onLeave[cur.id]) { try { onLeave[cur.id](); } catch (e) { } }
      cur.classList.remove('active');
    }
    var next = document.getElementById('screen-' + id);
    if (!next) return;
    next.classList.add('active');
    next.scrollTop = 0;
    document.getElementById('app').scrollTop = 0;
    $$('#tabbar .tab').forEach(function (t) {
      t.classList.toggle('on', t.dataset.go === (opts.tab || id));
    });
    document.body.classList.toggle('immersive', !!opts.immersive);
    if (!opts.silent) stack.push(id);
  }

  function setLeaveHandler(id, fn) { onLeave['screen-' + id] = fn; }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg, kind) {
    var t = $('#toast');
    t.className = 'toast show ' + (kind || '');
    t.innerHTML = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2200);
  }

  /* ---------- modal ---------- */
  function modal(opts) {
    var root = $('#modal-root');
    root.innerHTML = '';
    var back = el('div', 'modal-back');
    var box = el('div', 'modal');
    if (opts.title) box.appendChild(el('h2', 'modal-t', opts.title));
    var body = el('div', 'modal-b');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    box.appendChild(body);
    var acts = el('div', 'modal-a');
    (opts.actions || [{ label: 'OK' }]).forEach(function (a) {
      var b = el('button', 'btn ' + (a.cls || ''), a.label);
      b.type = 'button';
      b.onclick = function () {
        if (!a.keepOpen) close();
        if (a.onClick) a.onClick();
      };
      acts.appendChild(b);
    });
    box.appendChild(acts);
    back.appendChild(box);
    root.appendChild(back);
    root.classList.add('on');
    if (opts.dismissable !== false) {
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
    }
    requestAnimationFrame(function () { box.classList.add('in'); });
    function close() { root.classList.remove('on'); root.innerHTML = ''; }
    return { close: close };
  }

  /* ---------- sound (tiny WebAudio synth) ---------- */
  var ctx = null;
  function actx() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  var TONES = {
    tap: [[520, 0.04, 'square', 0.05]],
    click: [[320, 0.05, 'triangle', 0.06]],
    good: [[660, 0.08, 'sine', 0.10], [880, 0.12, 'sine', 0.09]],
    bad: [[180, 0.16, 'sawtooth', 0.07]],
    win: [[523, 0.10, 'sine', 0.10], [659, 0.10, 'sine', 0.10], [784, 0.10, 'sine', 0.10], [1047, 0.24, 'sine', 0.11]],
    lose: [[400, 0.12, 'sine', 0.08], [300, 0.2, 'sine', 0.08]],
    draw: [[440, 0.05, 'triangle', 0.05]],
    level: [[523, 0.08, 'square', 0.07], [784, 0.08, 'square', 0.07], [1047, 0.2, 'square', 0.08]]
  };

  function sound(name) {
    if (!Store.settings().sound) return;
    var seq = TONES[name];
    if (!seq) return;
    var c = actx();
    if (!c) return;
    var t = c.currentTime;
    seq.forEach(function (s) {
      var osc = c.createOscillator(), g = c.createGain();
      osc.type = s[2];
      osc.frequency.setValueAtTime(s[0], t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(s[3], t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + s[1]);
      osc.connect(g); g.connect(c.destination);
      osc.start(t); osc.stop(t + s[1] + 0.02);
      t += s[1] * 0.85;
    });
  }

  function haptic(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms || 12); } catch (e) { } }
  }

  /* ---------- confetti ---------- */
  function confetti() {
    var wrap = el('div', 'confetti');
    var cols = ['#e8b84b', '#4fb477', '#e0644f', '#5b9ad6', '#f2f0e6'];
    for (var i = 0; i < 40; i++) {
      var p = el('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = cols[i % cols.length];
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      p.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
      p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 3200);
  }

  /* ---------- reward popups ---------- */
  function flushRewards() {
    var items = Store.takePending();
    if (!items.length) return;
    var next = function () {
      var it = items.shift();
      if (!it) return;
      if (it.type === 'level') {
        sound('level');
        modal({
          title: 'Level ' + it.level + '!',
          body: '<div class="reward"><div class="reward-ico">⬆️</div><p>Nicely done. Your tile-reading is getting sharper.</p></div>',
          actions: [{ label: 'Nice', cls: 'primary', onClick: next }]
        });
      } else {
        sound('level');
        modal({
          title: 'Badge unlocked',
          body: '<div class="reward"><div class="reward-ico">' + it.badge.icon + '</div>' +
            '<h4>' + it.badge.name + '</h4><p>' + it.badge.desc + '</p></div>',
          actions: [{ label: 'Collect', cls: 'primary', onClick: next }]
        });
      }
    };
    next();
  }

  /* ---------- tile row builder ---------- */
  /**
   * opts: {cls, onTap(tile, index, node), sel:[indices], wide, small}
   */
  function tileRow(tiles, opts) {
    opts = opts || {};
    var row = el('div', 'trow' + (opts.wide ? ' wide' : '') + (opts.cls ? ' ' + opts.cls : ''));
    tiles.forEach(function (t, i) {
      var node = T.el(t, { button: !!opts.onTap });
      if (opts.small) node.classList.add('sm');
      if (opts.sel && opts.sel.indexOf(i) >= 0) node.classList.add('sel');
      if (opts.onTap) {
        node.addEventListener('click', function () { opts.onTap(t, i, node); });
      } else {
        node.classList.add('static');
      }
      row.appendChild(node);
    });
    return row;
  }

  /**
   * The single most important thing a learner needs to understand about the
   * two games. Shown wherever someone might confuse them.
   */
  function vsBlock(opts) {
    opts = opts || {};
    return '<div class="vsblock">' +
      '<div class="vs-row cn"><span class="vs-k">Chinese</span>' +
      '<p><b>You invent the hand.</b> Any four sets plus a pair wins. Nothing is written ' +
      'down — you build whatever your tiles allow and change your mind as they come.</p></div>' +
      '<div class="vs-sep"><span>the one real difference</span></div>' +
      '<div class="vs-row am"><span class="vs-k">American</span>' +
      '<p><b>You copy a hand.</b> A printed card lists every legal hand for the year. Yours ' +
      'must match one of them exactly, tile for tile. A beautiful hand that is not on the ' +
      'card is worth nothing at all.</p></div>' +
      (opts.tail ? '<p class="vs-tail">' + opts.tail + '</p>' : '') +
      '</div>';
  }

  global.UI = {
    $: $, $$: $$, el: el, md: md, esc: esc, vsBlock: vsBlock,
    screen: screen, setLeaveHandler: setLeaveHandler,
    toast: toast, modal: modal, sound: sound, haptic: haptic,
    confetti: confetti, flushRewards: flushRewards, tileRow: tileRow
  };
})(window);
