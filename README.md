# 🀄 Mahjong Dojo

A mobile-first web app for learning to play **real four-player mahjong** — not the
solitaire tile-matching game. It teaches **both** games that go by the name, because
they are far less alike than people expect.

|  | Chinese | American |
|---|---|---|
| **The goal** | **You invent the hand.** Any four sets plus a pair wins. Nothing is written down — you build whatever your tiles allow and change your mind as they come. | **You copy a hand.** A printed card lists every legal hand for the year. Yours must match one exactly, tile for tile. A beautiful hand that is not on the card is worth nothing. |
| Tiles | 136 | 152 — plus 8 flowers and 8 jokers |
| Runs (chows) | Yes, claimed from your left | None at all |
| Before play | Deal and go | The Charleston — passing tiles around |
| Scoring | Base points × doubles | The value printed beside the hand |

Everything else about American mahjong follows from that first row.

Interactive lessons for both, endlessly generated drills, and full games against three
AI opponents with a coach that shows you what it is thinking.

No build step, no dependencies, no backend. Open `index.html` and it runs.

---

## What's in it

**📚 Learn** — two tracks. **Chinese** (10 lessons) goes from "what is a tile" to playing
a hand. **American** (5 lessons) covers jokers, the Charleston, exposures, and reading a
card. Every lesson is tap-based: identify tiles, classify sets, pick discards, find
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

**🀄 Play** — full hands against three opponents, in either game.

*Chinese:* draw, discard, claim pung/chow/kong, declare mahjong. Optional **Coach** shows
how far you are from ready, what you are waiting on, and which discard leaves the most
outs — with a "why?" breakdown ranking every option.

*American:* the Charleston (three passes, an optional three more, then a courtesy pass),
exposure-only claims, joker redemption, and card-driven wins. The card is one tap away at
the table and shows your live distance to all 32 hands, sorted closest first.

**📖 Guide** — all 34 tiles with names, set shapes, the four wait patterns worth
memorising, a scoring table, a glossary, and an **American** section with the full card
and a side-by-side comparison of the two games.

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
waits, and scoring; validates that all 32 American card hands are exactly 14 tiles and
resolvable, and that jokers are accepted by kongs and quints but **refused** by pairs and
singles; then simulates full games in both rulesets to confirm the balance is sane, no
tiles leak, hand sizes stay legal, and every game terminates.
`npm run test:long` runs a larger simulation.

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
  tiles.js           tile identity + SVG faces (incl. flowers and jokers)
  rules.js           shanten, decomposition, waits, scoring   <- Chinese brain
  game.js            four-player Chinese engine + AI
  american-card.js   the hand card + pattern matcher          <- American brain
  american-game.js   152-tile engine, Charleston, exposures, AI
  lessons.js         lesson content for both tracks (declarative)
  store.js           progress / XP / badges (localStorage)
  ui.js              router, modals, toasts, sound, confetti
  learn.js           lesson player
  drills.js          puzzle generators + drill runner
  play.js            Chinese table screen
  american-play.js   American table screen
  reference.js       guide screen
  app.js             boot + home + mode picker
tools/sim.js         headless test harness
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

### The American engine

`american-card.js` is a second, unrelated brain. Shanten does not apply — the question is
never "how close am I to *a* hand" but "how close am I to *this printed line*".

Card hands are declarative, in a small pattern language:

```js
{ id: 'e1', cat: '2468', value: 25,
  label: 'FF  2222  4444  6666',
  g: [[2,'F'], [4,'A2'], [4,'A4'], [4,'A6']] }   // count, tile spec
```

`A`/`B`/`C` are suit variables always bound to *different* suits, `A+0..A+4` are
consecutive ranks for run hands, `dA` is the dragon belonging to suit A, and `Z` is the
White Dragon doubling as the digit 0. Matching tries every suit binding and every run
offset and keeps the best.

Groups are filled **smallest-first**, which is what makes joker handling correct: a joker
may fill a group of three or more but never a pair or a single, so pairs and singles must
get first claim on the real tiles.

### The AI

Opponents rank discards with the same engine as the player, then degrade deliberately.
Four max-efficiency players finish hands so fast that a learner never gets a turn that
matters, so each difficulty adds noise (chance of taking a merely-good discard) and caps
how far out they will claim from.

One rule the American AI needs that the Chinese one does not: an exposure is only legal
if it fits a single card hand *together with every exposure already on the rack*. Without
that check an AI happily mixes sets from incompatible hands until all fourteen tiles are
locked away and it has nothing left to discard.

## Rules implemented

**Chinese** — simplified Chinese-classical. 136 tiles (no flowers or seasons), 13-tile
hands, claims with `win > kong > pung > chow` priority, chow only from the upstream
player, concealed and open kongs with replacement draws from a 14-tile dead wall, and
exhaustive draws. Scoring is base points from sets multiplied by pattern doubles
(flushes, all-pungs, all simples, dragon and wind sets, concealed hand, self-draw, seven
pairs, thirteen orphans).

**American** — 152 tiles, the Charleston (right/across/left, optional reverse, courtesy
pass), jokers wild in groups of 3+ only, no chows, exposure-only claims from any player,
joker redemption, wall games, and payment where the thrower pays double or everyone does
on a self-pick.

Real mahjong scoring varies enormously by house. Both tables here are sensible defaults
for learning the *shape* of scoring, not tournament rulesets.

> ### On the American card
>
> The National Mah Jongg League publishes the official card each year and it is
> **copyrighted**. This app ships an **original card** — 32 hands across the nine classic
> categories, written for this project. The categories, shapes, and skills transfer, but
> no official hand is reproduced. To play for real, buy the current year's card.
>
> Two simplifications worth naming: blind passes are omitted (on a screen you always see
> your tiles, so the rule has nothing to bite on), and an exposure is validated against
> the hand's tile multiset rather than locked to one specific group.

## Licence

MIT
