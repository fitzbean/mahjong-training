/* ============================================================
   lessons.js — interactive lesson content
   Notation helper: tt('123m 456p 77z') -> [tile indices]
     m = Characters, p = Dots, s = Bamboo,
     z = honours 1..7 (E S W N White Green Red)
   ============================================================ */
(function (global) {
  'use strict';

  function tt(str) {
    var out = [];
    String(str).trim().split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      var suit = tok[tok.length - 1];
      var digits = tok.slice(0, -1);
      for (var i = 0; i < digits.length; i++) out.push(T.idx(suit, +digits[i]));
    });
    return out;
  }
  function t1(str) { return tt(str)[0]; }

  /* Step shapes the lesson renderer understands:
     info     {text, tiles?, caption?, wide?}
     choice   {q, tiles?, options[], answer, why}
     pick     {q, tiles[], answer:[idx...], why, count?}
     build    {q, pool[], goal:'pair'|'pung'|'chow', why}
     discard  {q, hand[], answer:[tile...], why}
     sort     {q, sets:[{tiles, label}], why}      -> label each group
  */

  var LESSONS = [

    /* ---------------------------------------------------------- */
    {
      id: 'suits', title: 'Meet the Tiles', sub: 'The three suits', icon: '🎋',
      steps: [
        {
          type: 'info',
          text: 'Mahjong uses **144 tiles**, but only **34 different kinds** — there are **four copies of every tile**.\n\nThat single fact drives almost every decision you will make.',
          tiles: tt('1p 1p 1p 1p'), caption: 'Four copies of 1 Dots'
        },
        {
          type: 'info',
          text: 'Three of the kinds are **suits**, numbered 1 to 9. First: **Dots** (筒). Count the circles.',
          tiles: tt('123456789p'), wide: true
        },
        {
          type: 'pick',
          q: 'Tap the **5 Dots**.',
          tiles: tt('3p 7p 5p 2p'), answer: [2],
          why: 'Five circles — four in the corners with one in the middle.'
        },
        {
          type: 'info',
          text: '**Bamboo** (索) are sticks. The 1 Bamboo is the odd one out — it is drawn as a **bird**, not a stick. Everybody trips on this once.',
          tiles: tt('123456789s'), wide: true
        },
        {
          type: 'pick',
          q: 'Tap the **1 Bamboo**.',
          tiles: tt('4s 1s 9s 2s'), answer: [1],
          why: 'The bird is 1 Bamboo. Remember it and you will never mis-read a hand again.'
        },
        {
          type: 'info',
          text: '**Characters** (萬) use Chinese numerals above the symbol 萬 ("ten thousand"). The bottom character is always the same — only the top one changes.',
          tiles: tt('123456789m'), wide: true
        },
        {
          type: 'choice',
          q: 'Which tile is this?',
          tiles: tt('7m'),
          options: ['7 Bamboo', '7 Characters', '7 Dots', 'A wind tile'],
          answer: 1,
          why: '七 is 7, and 萬 marks the Characters suit.'
        },
        {
          type: 'pick',
          q: 'Tap every **Dots** tile. There are three.',
          tiles: tt('4p 3s 8p 2m 1p 6s'), answer: [0, 2, 4], count: 3,
          why: 'Circles = Dots. Sticks = Bamboo. Chinese numerals = Characters.'
        }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'honors', title: 'Winds & Dragons', sub: 'The honour tiles', icon: '🀄',
      steps: [
        {
          type: 'info',
          text: 'Beyond the suits sit the **honour tiles**. They have no numbers, so they **cannot form runs** — only pairs and triplets.',
          tiles: tt('1234567z'), wide: true
        },
        {
          type: 'info',
          text: 'Four **winds**: East 東, South 南, West 西, North 北.\n\nEvery player is assigned a seat wind, and the whole round has a wind too. Sets of *your* wind are worth extra.',
          tiles: tt('1234z')
        },
        {
          type: 'info',
          text: 'Three **dragons**: White 白 (an empty frame), Green 發, Red 中.\n\nA set of any dragon always scores a bonus, whoever you are.',
          tiles: tt('567z')
        },
        {
          type: 'pick',
          q: 'Tap the **Red Dragon**.',
          tiles: tt('6z 1z 7z 5z'), answer: [2],
          why: '中 is the Red Dragon. 發 is green, and the blank frame is White.'
        },
        {
          type: 'choice',
          q: 'You hold 3 East winds and 3 Bamboo in a row. Which is impossible?',
          options: [
            'Three East winds as a triplet',
            'East–South–West as a run',
            '3-4-5 Bamboo as a run',
            'A pair of East winds'
          ],
          answer: 1,
          why: 'Honours have no sequence. East–South–West looks like an order, but it is not a run.'
        },
        {
          type: 'pick',
          q: 'Tap the two **honour** tiles.',
          tiles: tt('9p 3z 1s 6z 5m'), answer: [1, 3], count: 2,
          why: 'West wind and Green Dragon. The 9 Dots and 1 Bamboo are terminals — high-scoring, but still suit tiles.'
        }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'sets', title: 'Building Blocks', sub: 'Pair, pung, chow', icon: '🧩',
      steps: [
        {
          type: 'info',
          text: 'Everything in mahjong is built from three shapes. Learn these and you know the game.',
        },
        {
          type: 'info',
          text: '**PAIR** — two identical tiles. Your hand needs exactly one pair, sometimes called the "eyes".',
          tiles: tt('5s 5s')
        },
        {
          type: 'info',
          text: '**PUNG** — three identical tiles. Any tile can form a pung, honours included.',
          tiles: tt('3z 3z 3z')
        },
        {
          type: 'info',
          text: '**CHOW** — three consecutive numbers **in the same suit**. No wrapping: 8-9-1 is not a chow.',
          tiles: tt('456p')
        },
        {
          type: 'sort',
          q: 'Name each group.',
          sets: [
            { tiles: tt('789s'), label: 'chow' },
            { tiles: tt('2m 2m 2m'), label: 'pung' },
            { tiles: tt('6z 6z'), label: 'pair' },
            { tiles: tt('3p 4p 6p'), label: 'none' }
          ],
          why: '3-4-6 Dots has a hole in it. It is one tile away from a chow, but it is not a set yet.'
        },
        {
          type: 'choice',
          q: 'Is **8 Dots, 9 Dots, 1 Dots** a valid chow?',
          tiles: tt('8p 9p 1p'),
          options: ['Yes — they are consecutive', 'No — runs never wrap past 9'],
          answer: 1,
          why: 'Runs stop at 9. 7-8-9 is the highest chow in any suit.'
        },
        {
          type: 'choice',
          q: 'Is **5 Dots, 5 Bamboo, 5 Characters** a valid pung?',
          tiles: tt('5p 5s 5m'),
          options: ['Yes — all fives', 'No — a pung needs identical tiles'],
          answer: 1,
          why: 'Same number is not enough. A pung is three of the *same tile*.'
        },
        {
          type: 'build',
          q: 'Tap three tiles to build a **chow**.',
          pool: tt('2m 7p 4m 3m 9s'), goal: 'chow',
          why: '2-3-4 Characters. Same suit, three in a row.'
        },
        {
          type: 'build',
          q: 'Now build a **pung**.',
          pool: tt('7z 4s 7z 1p 7z 4s'), goal: 'pung',
          why: 'Three Red Dragons. Honours can never make a chow, but they pung happily.'
        }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'winning', title: 'The Winning Hand', sub: 'Four sets and a pair', icon: '🏆',
      steps: [
        {
          type: 'info',
          text: 'Here is the whole goal of mahjong:\n\n# 4 sets + 1 pair\n\nEach set is a pung **or** a chow, in any mix. That is 14 tiles.',
        },
        {
          type: 'info',
          text: 'A complete hand. Read it as blocks, not as fourteen loose tiles.',
          tiles: tt('123m 456m 789m 111z 55p'), wide: true,
          caption: 'chow · chow · chow · pung · pair'
        },
        {
          type: 'info',
          text: 'Between turns you hold **13** tiles. You draw a 14th, then discard one — so your hand is 14 tiles only for a moment. Win on that moment and you are done.'
        },
        {
          type: 'choice',
          q: 'Is this hand complete?',
          tiles: tt('234p 234p 55s 678m 999s'), wide: true,
          options: ['Yes — 4 sets and a pair', 'No — something is missing'],
          answer: 0,
          why: '2-3-4 Dots, 2-3-4 Dots, 6-7-8 Characters, 9-9-9 Bamboo, pair of 5 Bamboo. Duplicate chows are perfectly legal.'
        },
        {
          type: 'choice',
          q: 'And this one?',
          tiles: tt('123s 456s 789s 111p 23p'), wide: true,
          options: ['Yes — complete', 'No — the last block is not a pair'],
          answer: 1,
          why: '2-3 Dots is a partial run, not a pair. You need a 1 or 4 Dots to make it a set — but then you would have five sets and no pair. This hand is still one tile away.'
        },
        {
          type: 'pick',
          q: 'This hand is 13 tiles and needs **one** more. Tap the tile that completes it.',
          hand: tt('123m 456m 789m 11z 55p'),
          tiles: tt('1z 3z 2m 9s'), answer: [0],
          why: 'A third East wind turns the pair of Easts into a pung, leaving 5-5 Dots as the pair. Winner.'
        },
        {
          type: 'pick',
          q: 'Trickier. Which tiles win this hand? There are **two** answers.',
          hand: tt('234p 567p 234s 99m 78s'),
          tiles: tt('6s 9s 9m 3p'), answer: [0, 1], count: 2,
          why: '7-8 Bamboo is an open-ended wait: both 6 and 9 Bamboo complete it. Two-sided waits are the best kind — eight tiles can save you instead of four.'
        }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'turn', title: 'A Turn of Play', sub: 'Draw, discard, repeat', icon: '🔄',
      steps: [
        {
          type: 'info',
          text: 'Four players. Everyone gets 13 tiles; the dealer gets one extra and starts.\n\nA turn is two beats:\n\n**1.** Draw a tile from the wall.\n**2.** Discard one tile, face up.\n\nPlay then passes to the next player. That is the entire loop.'
        },
        {
          type: 'info',
          text: 'The trick is choosing *what* to discard. Every tile you keep should be doing a job: part of a set, or close to becoming one.\n\nA tile with no neighbours and no partner is called a **floater** — usually the first thing to go.'
        },
        {
          type: 'discard',
          q: 'Your turn. One tile here is doing nothing at all — discard it.',
          hand: tt('123m 456m 789m 55p 2p 8p 4z'),
          answer: [t1('4z')],
          why: 'You already hold three chows and a pair. The 2 and 8 Dots can still grow into runs, but the lone North wind cannot — honours only ever pair or pung. Throw it first.'
        },
        {
          type: 'info',
          text: 'Two more habits worth building early:\n\n• **Watch the discards.** Four of a tile are already gone? Stop waiting on it.\n• **Middle tiles connect more.** A 5 can sit in three different runs; a 1 can sit in only one.'
        },
        {
          type: 'choice',
          q: 'You need one more tile. Which wait is better?',
          options: [
            'Waiting on 3 Dots only (you hold 2-4 Dots)',
            'Waiting on 3 or 6 Dots (you hold 4-5 Dots)'
          ],
          answer: 1,
          why: 'An open-ended wait sees **8** possible tiles instead of 4. When you can choose your shape, choose the two-sided one.'
        },
        {
          type: 'discard',
          q: 'Last one. One discard here puts you **ready to win**. Find it.',
          hand: tt('345s 678s 789m 22z 34p 1m'),
          answer: [t1('1m')],
          why: 'Three chows, a pair of South winds, and 3-4 Dots waiting on 2 or 5. Drop the isolated 1 Characters and you are ready — eight tiles in the wall will win it for you.'
        }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'claims', title: 'Stealing Discards', sub: 'Pung, chow, and priority', icon: '✋',
      steps: [
        {
          type: 'info',
          text: 'Here is what makes mahjong a *game* rather than solitaire: you can **take other players\' discards**.\n\nWhen someone throws a tile you can use, you call for it before the next player draws.'
        },
        {
          type: 'info',
          text: '**PUNG** — you hold two matching tiles, someone discards the third. Call it from **anyone**, at any seat.',
          tiles: tt('8s 8s'), caption: 'Holding this? Any 8 Bamboo discard is yours.'
        },
        {
          type: 'info',
          text: '**CHOW** — completes a run, but only from the player **immediately before you**. You cannot chow across the table.',
          tiles: tt('4p 5p'), caption: 'Needs a 3 or 6 Dots — from your left-hand neighbour only.'
        },
        {
          type: 'info',
          text: 'Two catches, and they matter:\n\n• A claimed set is placed **face up** and can never change. Your hand is now **open**.\n• An open hand loses the concealed-hand bonus and telegraphs your plan to the table.\n\nClaim to go faster; stay closed to score more.'
        },
        {
          type: 'choice',
          q: 'Two players want the same discard: one for a chow, one for a pung. Who gets it?',
          options: ['The chow — runs come first', 'The pung — it outranks a chow', 'Whoever calls loudest'],
          answer: 1,
          why: 'Priority is **win > kong > pung > chow**. A win beats everything, and a pung always beats a chow.'
        },
        {
          type: 'choice',
          q: 'The player across the table discards 6 Dots. You hold 4-5 Dots. Can you chow it?',
          tiles: tt('4p 5p'),
          options: ['Yes — it completes 4-5-6', 'No — chow only from the player on your left'],
          answer: 1,
          why: 'The shape is right but the seat is wrong. Chows come only from the player whose turn precedes yours. You would have to draw it yourself.'
        },
        {
          type: 'choice',
          q: 'You are one tile from winning, fully concealed. Someone discards a tile that lets you **pung** — but the pung does not bring you closer. Call it?',
          options: ['Yes — always take free tiles', 'No — you would open your hand for nothing'],
          answer: 1,
          why: 'Claiming costs you the concealed bonus permanently. If it does not speed you up, let it go.'
        }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'ready', title: 'Reading Your Hand', sub: 'Counting the distance', icon: '🎯',
      steps: [
        {
          type: 'info',
          text: 'Strong players do not see fourteen tiles. They see **how far from a win** they are.\n\nThat distance has a name: **shanten**.\n\n• shanten 1 = one tile away from *ready*\n• shanten 0 = **ready** — the next right tile wins\n\nReady is also called **tenpai**.'
        },
        {
          type: 'info',
          text: 'This hand is **ready**. Four blocks are done, and 7-8 Bamboo needs one tile.',
          tiles: tt('123m 456m 789m 55p 78s'), wide: true,
          caption: 'Waiting on 6 or 9 Bamboo'
        },
        {
          type: 'pick',
          q: 'Which tiles win this hand? Tap **both**.',
          hand: tt('123m 456m 789m 55p 78s'),
          tiles: tt('5s 6s 9s 5p'), answer: [1, 2], count: 2,
          why: 'An open-ended wait. Eight live tiles instead of four — the difference between winning and staring at the wall.'
        },
        {
          type: 'info',
          text: 'The four waits worth knowing by sight:\n\n• **Two-sided** (7-8 → 6 or 9) — 8 tiles. Best.\n• **Pair wait** (5-5 → 5) — 2 tiles. Weakest.\n• **Closed gap** (5-7 → 6) — 4 tiles.\n• **Edge** (1-2 → 3 only) — 4 tiles. A 1-2 cannot take a 0.'
        },
        {
          type: 'choice',
          q: 'You are ready and can swap to a different wait for free. Which do you take?',
          options: ['Pair wait on West wind', 'Closed gap on 4 Dots', 'Two-sided on 3 / 6 Bamboo'],
          answer: 2,
          why: 'Twice the outs. When two waits score the same, take the wider one every time.'
        },
        {
          type: 'pick',
          q: 'Careful with this one. Tap **every** tile that wins it.',
          hand: tt('234p 567p 234s 456s 9m'),
          tiles: tt('9m 3s 7s 1p'), answer: [0], count: 1,
          why: 'Only the 9 Characters — it pairs up your lone tile to finish the hand. The 4-5-6 Bamboo is already a completed chow, so 3 and 7 Bamboo add nothing at all. Always recount your blocks before trusting a wait.'
        },
        {
          type: 'info',
          text: 'Two tiles of your wait are sitting face-up in the discards? You are waiting on the last two copies. Sometimes the right move is to **break a ready hand** and re-aim at a wait that is still alive.\n\nThe Coach in Play mode shows your shanten and your live outs — lean on it until you can see them yourself.'
        }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'kong', title: 'Kongs', sub: 'The fourth tile', icon: '💠',
      steps: [
        {
          type: 'info',
          text: 'A **kong** is all four copies of a tile. It counts as one set, but since a hand is 14 tiles, taking a kong entitles you to a **replacement draw** from the back of the wall.',
          tiles: tt('6p 6p 6p 6p')
        },
        {
          type: 'info',
          text: 'Three ways to make one:\n\n• **Concealed** — you draw the fourth yourself. Stays face-down and scores double.\n• **Open** — you hold three and someone discards the fourth.\n• **Extended** — you already melded a pung and later draw the fourth.'
        },
        {
          type: 'choice',
          q: 'Why is a concealed kong worth more than an open one?',
          options: [
            'It uses more tiles',
            'You did it without help — concealed sets score double',
            'It happens on your own turn'
          ],
          answer: 1,
          why: 'Mahjong scoring rewards self-sufficiency. Concealed sets of terminals and honours are the biggest routine points in the game.'
        },
        {
          type: 'choice',
          q: 'You hold four 3 Dots and your hand is 1 away. Should you kong?',
          options: [
            'Always — free tile',
            'Only if it does not break a shape you need'
          ],
          answer: 1,
          why: 'Those four tiles might be doing better work as 3-3 plus two runs. A kong locks them into one set forever. Free draws are nice; a broken hand is not.'
        }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'scoring', title: 'Scoring', sub: 'Why hands differ in value', icon: '💰',
      steps: [
        {
          type: 'info',
          text: 'Any 4-sets-and-a-pair wins. But **what** those sets are made of decides how much you collect.\n\nScoring works in two layers:\n\n• **Base points** from your sets\n• **Doubles** from patterns across the whole hand'
        },
        {
          type: 'info',
          text: 'Base points reward difficulty:\n\n• Chow — 0 (easy to build)\n• Pung of simples (2-8) — 2\n• Pung of terminals or honours — 4\n• Concealed — **doubles** the set\n• Kong — four times its pung'
        },
        {
          type: 'info',
          text: 'Doubles come from the shape of the whole hand. The common ones:\n\n• **Dragon set** — ×2\n• **Your seat or round wind set** — ×2\n• **All Pungs** (no chows) — ×4\n• **Half Flush** (one suit + honours) — ×4\n• **Full Flush** (one suit, nothing else) — ×16\n• **Self-Draw** / **Concealed hand** — ×2 each'
        },
        {
          type: 'choice',
          q: 'Which hand pays more?',
          options: [
            'Four chows and a pair, mixed suits',
            'Four concealed pungs of honours and terminals'
          ],
          answer: 1,
          why: 'The chow hand scrapes the minimum. The pung hand stacks concealed bonuses, All Pungs, and All Terminals & Honours — easily a hundred times more.'
        },
        {
          type: 'info',
          text: 'The practical advice for a beginner:\n\n**Win first, optimise later.** A cheap win beats a beautiful hand you never finish. Once you are landing wins reliably, start noticing when your tiles are already leaning towards one suit — that is when the big hands appear on their own.'
        }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'together', title: 'Putting It Together', sub: 'A real hand, start to finish', icon: '🎓',
      steps: [
        {
          type: 'info',
          text: 'One full hand, four decisions. No hints this time.'
        },
        {
          type: 'discard',
          q: 'Opening hand, 14 tiles. What goes?',
          hand: tt('234p 55p 678s 234m 9m 1z 4z'),
          answer: [t1('1z'), t1('4z')],
          why: 'Three chows and a pair are locked in; you need one more set from 9 Characters, East, and North. All three are isolated — but a 9 can still grow into 7-8-9, while a wind can only ever pair or pung. Either wind is right, and the other goes next turn.'
        },
        {
          type: 'choice',
          q: 'You hold 4-5 Dots and the player on your **left** discards 3 Dots. It puts you at ready. Call it?',
          options: ['Yes — chow, and you are ready', 'No — never open your hand'],
          answer: 0,
          why: 'Correct seat, and it takes you all the way to ready. The concealed bonus is worth two doubles; being ready three turns early is worth more.'
        },
        {
          type: 'pick',
          q: 'Now you are here. Which tile wins?',
          hand: tt('234p 55p 678s 234m 78m'),
          tiles: tt('6m 9m 5p 3m'), answer: [0, 1], count: 2,
          why: '7-8 Characters, open-ended: 6 or 9 both finish it. You are on the best wait in the game.'
        },
        {
          type: 'choice',
          q: 'You draw the 9 Characters yourself. What is that worth beyond the win?',
          options: ['Nothing extra', 'A Self-Draw bonus — ×2'],
          answer: 1,
          why: 'Finishing off your own draw scores an extra double. Same tile, twice the payout, purely for where it came from.'
        },
        {
          type: 'info',
          text: '# That is the game.\n\nDraw, discard, watch the table, claim when it helps. Everything else is refinement.\n\nHead to **Drills** to sharpen your reading, or **Play** a full hand against three opponents with the Coach switched on.'
        }
      ]
    }
  ];

  global.LESSONS = LESSONS;
  global.tt = tt;
})(window);
