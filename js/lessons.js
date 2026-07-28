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

  /* ============================================================
     American mahjong — a separate track, unlocked on its own
     ============================================================ */
  var J = 35, FL = 34;

  var AM_LESSONS = [
    {
      id: 'am-what', title: 'A Different Game', sub: 'Why American is not a variant', icon: '🗽',
      steps: [
        {
          type: 'info',
          text: 'American mahjong shares its tiles with the Chinese game and almost nothing else.\n\nHere is the whole difference:\n\n# Chinese: you invent the hand.\n\nAny four sets plus a pair wins. Nothing is written down anywhere. You look at your tiles, decide what they could become, and change your mind every turn as new ones arrive.'
        },
        {
          type: 'info',
          text: '# American: you copy a hand.\n\nEvery year the National Mah Jongg League prints a **card** listing the exact hands that are legal that year — around fifty of them. Your fourteen tiles must match one of those lines **exactly**.\n\nNot "close to". Exactly.'
        },
        {
          type: 'info',
          text: 'So the whole skill inverts.\n\n• **Chinese** — you read your *tiles* and ask what they could become. The answer is open-ended.\n• **American** — you read the *card* and ask which line your tiles are nearest. The answers are a fixed list.\n\nThere is no shanten here. The only question is: how many tiles am I from *this specific printed hand*?'
        },
        {
          type: 'info',
          text: 'The set grows too. **152 tiles**, not 136:\n\n• the usual 136\n• **8 flowers** — in this game they are ordinary tiles that hands ask for, not bonuses\n• **8 jokers** — the wildcard that changes everything',
          tiles: [FL, FL, J, J]
        },
        {
          type: 'choice',
          q: 'You build three chows and a pung with a tidy pair — a clean win in the Chinese game. It is not printed on the card. What is it worth in American mahjong?',
          tiles: tt('123m 456m 789m 111z 55p'), wide: true,
          options: ['A standard win', 'Nothing — it is not a legal hand'],
          answer: 1,
          why: 'This is the hardest habit to unlearn. In Chinese mahjong that hand wins outright. In American mahjong it is fourteen loose tiles, because no line of the card says that. Beginners lose whole games building something elegant and unplayable.'
        },
        {
          type: 'choice',
          q: 'Which of these does American mahjong have no use for at all?',
          tiles: tt('456p'),
          options: ['Pungs', 'Chows — runs of three different tiles', 'Pairs'],
          answer: 1,
          why: 'There is no chow in American mahjong. Card hands do use consecutive numbers, but always as *groups of matching tiles* — three 4s, three 5s, three 6s — never as a run of three different tiles. You will never claim a discard to make one.'
        },
        {
          type: 'info',
          text: 'One more thing worth knowing up front: the official NMJL card is **copyrighted** and reissued every year.\n\nThis app therefore uses an **original card** written in the same style — same categories, same shapes, same skills — so nothing here reproduces the real one. Learn on this, then buy the current card to play for real.'
        }
      ]
    },

    {
      id: 'am-joker', title: 'Jokers', sub: 'The wildcard and its one limit', icon: '🃏',
      steps: [
        {
          type: 'info',
          text: 'A **joker** stands in for any tile — but only inside a group of **three or more**.',
          tiles: [J]
        },
        {
          type: 'info',
          text: 'So a joker is welcome in a pung, a kong, or a quint:',
          tiles: tt('5p 5p').concat([J]),
          caption: 'A legal pung of 5 Dots'
        },
        {
          type: 'choice',
          q: 'Your hand needs a **pair** of flowers and you hold one flower and a joker. Are you there?',
          tiles: [FL, J],
          options: ['Yes — the joker fills the pair', 'No — jokers cannot be used in a pair'],
          answer: 1,
          why: 'Never in a pair, never as a single. This is why the "Singles and Pairs" hands on the card pay so much: no joker can ever help you.'
        },
        {
          type: 'choice',
          q: 'A card hand asks for **five** of the same tile. Only four exist. How?',
          options: ['It is a misprint', 'A joker makes up the fifth', 'You use a flower'],
          answer: 1,
          why: 'Quints are impossible without jokers. Reaching for one is a bet that you will find them.'
        },
        {
          type: 'info',
          text: 'Two rules that follow from jokers being precious:\n\n• You may **never pass a joker** during the Charleston.\n• A **discarded joker is dead** — nobody may claim it. Throwing one away is close to unthinkable.'
        },
        {
          type: 'info',
          text: '**Joker redemption.** If a player has exposed a set containing a joker, and you hold the real tile it stands for, you may swap on your turn: give the tile, take the joker.\n\nExposing a joker is therefore a small risk. Sometimes worth it, sometimes not.'
        },
        {
          type: 'choice',
          q: 'You are one tile short and holding a spare joker. Which hand should you steer toward?',
          options: [
            'A Singles and Pairs hand worth 50',
            'A hand with a kong the joker can complete'
          ],
          answer: 1,
          why: 'A joker is worth nothing to a singles-and-pairs hand. Let the tiles you actually hold pick the target.'
        }
      ]
    },

    {
      id: 'am-charleston', title: 'The Charleston', sub: 'Passing before play begins', icon: '🔀',
      steps: [
        {
          type: 'info',
          text: 'Before anyone draws a tile, everyone passes tiles around. It is called the **Charleston**, and it has no equivalent in Chinese mahjong.\n\nThree tiles at a time, all four players at once.'
        },
        {
          type: 'info',
          text: 'The first Charleston is three passes:\n\n• 3 tiles **right**\n• 3 tiles **across**\n• 3 tiles **left**\n\nThen, if **all four** players agree, a second Charleston runs the other way: left, across, right. Any one player can stop it.'
        },
        {
          type: 'info',
          text: 'Finally an optional **courtesy pass** with the player across: you each name a number from 0 to 3, and the smaller number is what you swap.\n\nOnly then does the dealer discard and real play start.'
        },
        {
          type: 'choice',
          q: 'You are dealt three jokers. What do you pass?',
          options: ['The jokers — they are worth a lot in trade', 'Anything else. Jokers may never be passed'],
          answer: 1,
          why: 'It is a hard rule, not a strategy. Jokers stay with whoever is dealt them.'
        },
        {
          type: 'choice',
          q: 'Why is the Charleston strategically dangerous?',
          options: [
            'You might pass a tile you need later',
            'What you pass tells the table what you are not collecting',
            'Both of these'
          ],
          answer: 2,
          why: 'Three winds passed left says "I am not going for winds" as loudly as anything. Good players read the passes and remember them all hand.'
        },
        {
          type: 'info',
          text: 'The practical advice for your first games:\n\n• Open the card **before** you pass anything. Find two or three hands your tiles lean toward.\n• Pass what fits none of them.\n• Do not commit too early — the second Charleston can change everything.'
        }
      ]
    },

    {
      id: 'am-play', title: 'Calling & Exposing', sub: 'How American turns work', icon: '📣',
      steps: [
        {
          type: 'info',
          text: 'Play looks familiar — draw a tile, discard a tile, round and round. What changes is **claiming**.'
        },
        {
          type: 'info',
          text: 'You may claim a discard from **anyone** at the table. No left-hand-neighbour rule, because there are no chows to make.\n\nBut you may only claim to make an **exposure**: three or more matching tiles that form a group in the hand you are chasing. You put it face up on your rack, and it is locked there.'
        },
        {
          type: 'choice',
          q: 'You hold 4-5 Dots and someone discards 6 Dots. Can you call it?',
          tiles: tt('4p 5p'),
          options: ['Yes — that is a run', 'No — there is no such thing as a chow here'],
          answer: 1,
          why: 'Card hands do contain consecutive numbers, but they appear as *groups of like tiles* — three 4s, three 5s, three 6s. You never claim a discard to make a run of three different tiles.'
        },
        {
          type: 'choice',
          q: 'What does exposing a set cost you?',
          options: [
            'Nothing, it is free information',
            'Flexibility — you are now committed to hands containing that set'
          ],
          answer: 1,
          why: 'And the table can see it. Three exposed dragons tell everyone exactly which line of the card you are on, and they will stop feeding you.'
        },
        {
          type: 'info',
          text: 'When your fourteenth tile completes a card hand you call **Mah Jongg** and expose everything.\n\nIf you call it and you are wrong, that is a dead hand — you are out for the rest of the round. Count twice before you call.'
        },
        {
          type: 'info',
          text: '**Payment** works differently too:\n\n• The hand has a printed value on the card.\n• If you **self-pick** the winning tile, all three players pay double.\n• Otherwise whoever **threw** the tile pays double, and the other two pay single.\n\nSo discarding into a big exposed hand is genuinely expensive. Watch the racks.'
        }
      ]
    },

    {
      id: 'am-card', title: 'Reading the Card', sub: 'Choosing a target', icon: '🗂️',
      steps: [
        {
          type: 'info',
          text: 'The card is grouped into **categories** — families of hands built on one idea. This app\'s card uses the classic ones:\n\n• **2026** — the year, using the White Dragon as a zero\n• **2468** and **13579** — even and odd numbers\n• **Like Numbers** — the same number across suits\n• **Consecutive Run** — runs of adjacent numbers\n• **369**, **Winds & Dragons**, **Quints**, **Singles & Pairs**'
        },
        {
          type: 'info',
          text: 'One convention runs through all of it: each suit has a **matching dragon**.\n\n• Craks (Characters) go with the **Red** dragon\n• Bams (Bamboo) go with the **Green** dragon\n• Dots go with the **White** dragon — the "soap"\n\nWhen a card line says "DDD" next to a suit, it means that suit\'s dragon.',
          tiles: tt('1m 7z 1s 6z 1p 5z'), wide: true
        },
        {
          type: 'choice',
          q: 'A hand reads "FF 2222 4444 6666 — any one suit". You hold four 2 Bams and three 4 Bams. What suit are you in?',
          options: ['Bams, and you need one more 4 plus four 6s and two flowers', 'Any suit you like'],
          answer: 0,
          why: '"Any one suit" means you choose which — but once your tiles are in Bams, the whole hand is Bams. Mixing suits breaks it.'
        },
        {
          type: 'choice',
          q: 'Why does the White Dragon appear in the 2026 hands?',
          options: [
            'It is a wildcard there',
            'Its blank face reads as a zero'
          ],
          answer: 1,
          why: 'Players call it the "soap" and read it as 0. It is how the card writes years like 2026 with tiles.'
        },
        {
          type: 'info',
          text: 'How strong players actually use the card:\n\n• After the deal, find **two or three** plausible hands, never one.\n• Prefer hands where jokers can help — anything with kongs and quints.\n• Note the value, but do not chase a 50-point hand with tiles that do not support it.\n• Keep re-reading. The right hand at tile 5 is often the wrong one by tile 20.'
        },
        {
          type: 'info',
          text: '# You are ready.\n\nHit **Play** and choose American. The card is one tap away at the table, and it shows your distance to every hand — use it constantly at first, then less and less.'
        }
      ]
    }
  ];

  global.LESSONS = LESSONS;
  global.AM_LESSONS = AM_LESSONS;
  global.ALL_LESSONS = LESSONS.concat(AM_LESSONS);
  global.tt = tt;
})(window);
