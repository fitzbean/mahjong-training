# 🀄 Mahjong Dojo

A mobile-first web app for learning to play **real four-player mahjong** — not the
solitaire tile-matching game. Interactive lessons, endlessly generated drills, and a
full game against three AI opponents with a coach that shows you what it is thinking.

No build step, no dependencies, no backend. Open `index.html` and it runs.

---

## What's in it

**📚 Learn** — ten short interactive lessons that go from "what is a tile" to playing a
hand. Every lesson is tap-based: identify tiles, classify sets, pick discards, find
winning tiles. Lessons unlock in sequence and are scored out of three stars.

**⚡ Drills** — four mini-games built on procedural generators, so they never run out:

| Drill | What it trains |
|---|---|
| Tile Rush | Recognising all 34 tiles at speed, with deliberately confusable decoys |
| Set Snap | Telling pair / pung / chow from near-misses (gapped runs, mixed suits, "honour runs") |
| Discard Master | Choosing the discard that leaves the most winning chances |
| Ready Check | Spotting *every* tile that completes a hand |

Discard Master and Ready Check generate fresh hands and grade them with the same engine
that drives the AI — puzzles are only shown if they have a demonstrably correct answer.

**🀄 Play** — a full hand against three opponents. Draw, discard, claim pung/chow/kong,
declare mahjong. Optional **Coach** shows how far you are from ready, what you are
waiting on, and which discard leaves the most outs — with a "why?" breakdown ranking
every option.

**📖 Guide** — all 34 tiles with names, set shapes, the four wait patterns worth
memorising, a scoring table, and a glossary.

Progress, XP, levels, daily streaks, and twelve badges are stored in `localStorage`.

---

## Running it

Open `index.html` directly in a browser, or serve the folder:

```bash
npm start
```

Then visit `http://localhost:4189`. It is installable as a PWA.

## Tests

The rules engine has a headless harness that loads the browser modules into a VM
sandbox — no DOM required:

```bash
npm test
```

It checks shanten, hand decomposition, win detection (against 20,000 random hands),
waits, and scoring, then simulates full games at each difficulty to confirm the balance
is sane and no tiles leak. `npm run test:long` runs a larger simulation.

A balance run of 30 games per difficulty, coached human vs three AI:

```
gentle    human  57% | ai  33% | draw  10%
standard  human  50% | ai  47% | draw   3%
sharp     human  37% | ai  60% | draw   3%
```

Samples this small are noisy — individual runs swing by 15–20 points. The number that
matters is that a coached human beats the 25% an even four-way split would give, and
that the difficulties order correctly over longer runs. Use `npm run test:long` for
figures worth quoting.

---

## How it is built

Plain ES5-style JavaScript in ordered `<script>` tags — no bundler, no framework, works
from `file://`. Tiles are drawn as inline SVG rather than Unicode glyphs, because the
Unicode mahjong block renders inconsistently (or as emoji) across platforms.

```
index.html
css/styles.css
js/
  tiles.js      tile identity + SVG faces
  rules.js      shanten, decomposition, waits, scoring        <- the brain
  game.js       four-player engine + AI opponents
  lessons.js    lesson content (declarative)
  store.js      progress / XP / badges (localStorage)
  ui.js         router, modals, toasts, sound, confetti
  learn.js      lesson player
  drills.js     puzzle generators + drill runner
  play.js       the table screen
  reference.js  guide screen
  app.js        boot + home
tools/sim.js    headless test harness
```

### The engine

`rules.js` is the interesting part. Everything else reads from it.

- **Shanten** — distance from a winning hand, via recursive block decomposition with
  pruning and a memo cache. Handles the standard four-sets-and-a-pair shape plus seven
  pairs and thirteen orphans.
- **Acceptance ("outs")** — for any hand, which unseen tiles improve it, and how many
  copies are still live given everything visible on the table.
- **Discard ranking** — every possible discard scored by resulting shanten, then by
  live outs, then by a safety bias that sheds isolated honours first. This single
  function powers the AI, the Coach, and the Discard Master grader.

### The AI

Opponents rank discards with the same engine, then degrade deliberately. Four
max-efficiency players finish hands so fast that a learner never gets a turn that
matters, so each difficulty adds noise (chance of taking a merely-good discard) and caps
how far out they will claim from.

## Rules implemented

Simplified Chinese-classical. 136 tiles (no flowers or seasons), 13-tile hands, claims
with `win > kong > pung > chow` priority, chow only from the upstream player, concealed
and open kongs with replacement draws from a 14-tile dead wall, and exhaustive draws.

Scoring is base points from sets multiplied by pattern doubles (flushes, all-pungs, all
simples, dragon and wind sets, concealed hand, self-draw, seven pairs, thirteen
orphans). Real mahjong scoring varies enormously by house — this is a sensible default
for learning the *shape* of scoring, not a tournament ruleset.

## Licence

MIT
