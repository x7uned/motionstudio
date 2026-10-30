# Факты и источники · «A casino doesn't need to cheat you» (Casino secrets 1/5)

(Скопировано из `casino-math/script.md` и `casino-math/research.md`; текст озвучки не менялся.)

## Факты и ссылки
- Европейское колесо: 37 ячеек (0–36), ставка на число платит 35 к 1 (честно было бы для 36 чисел); преимущество казино 2,7%. Американское с 0 и 00 — 5,26%. https://en.wikipedia.org/wiki/Roulette , https://wizardofodds.com/gambling/house-edge/
- Закон больших чисел: на одной ставке результат случаен, на миллионах остаётся только преимущество. https://findanexpert.unimelb.edu.au/news/135889-the-science-of-the-casino--why-the-house-always-wins-in-the-long-run
- Удвоение после проигрыша (мартингейл): 10 проигрышей подряд = ставка в 1 024 раза больше первой ради выигрыша одной единицы; матожидание всё равно отрицательное. https://en.wikipedia.org/wiki/Martingale_(betting_system)
- Казино может проиграть месяц: Wynn Palace (Макао), апрель 2017, минус больше 10 млн долларов на баккара. https://fortune.com/2017/07/29/casino-mogul-steve-wynn-lost-baccarat

**Оговорки:** «Someone at the table usually does» — в любой вечер кто-то в плюсе, это не обещание. «A few cents from every bet» — 2,7 цента с доллара на европейском колесе. Мы не говорим, что лимиты стола существуют против удвоения (это миф). История Монте-Карло 1913 уже была в другом ролике и здесь не повторяется.


## Исследование (research.md)


Checked 2026-10-27 with web search/fetch. "Computed" = my own arithmetic (python), not a source claim.

## Claims

### 1. Roulette house edge — TRUE
- European wheel: 37 pockets (0-36, one green 0). American: 38 (0 and 00). Straight-up pays 35 to 1 on both.
- Edge per $1 straight-up, Europe: (1/37)*35 - (36/37) = -1/37 = **-2.70%**. USA: -2/38 = **-5.26%** (computed; matches sources).
- Plain framing "pays you as if the green number wasn't there" = TRUE: 36 numbers would pay 35:1 fairly; the wheel has 37, still pays 35:1.
- Country: Europe/UK mostly single zero (2.70%). Most US casinos double zero (5.26%); some US casinos run single-zero tables. French "la partage" rule (even-money bets, half back on zero) halves the edge to ~1.35% (computed; the Wikipedia page I fetched describes the rule but gives no figure).
- Src: https://en.wikipedia.org/wiki/Roulette ; https://wizardofodds.com/gambling/house-edge/ (2.70% / 5.26%)

### 2. Law of large numbers — TRUE
- One bet is noise; the small fixed edge shows only over many bets. Computed for a $1 straight-up bet on a European wheel (normal approximation, sd 5.84 per bet):
  - after 100 bets: expected loss $2.70, player still ahead ≈ 48% of the time;
  - after 10,000 bets: expected loss $270, player ahead ≈ 32%;
  - after 1,000,000 bets: expected loss ≈ $27,000, sd ≈ $5,800, player ahead ≈ 0.0002% (about 1 in 500,000).
- Src (explainers): https://findanexpert.unimelb.edu.au/news/135889-the-science-of-the-casino--why-the-house-always-wins-in-the-long-run (Univ. Melbourne). Numbers above are mine.

### 3. Martingale fails — TRUE (with a nuance)
- Doubling after each loss: 10 losses in a row costs 1,023x the first bet. On American roulette red/black, chance of 10 losses in a row ≈ 0.16% per round (computed 0.163%). You win 1 unit ~99.8% of the time and lose ~1,000 units the rest: expected value still negative. Finite bankroll alone breaks it; a table cap makes it worse.
- NUANCE: Wikipedia "Table limit" says casinos are not really afraid of Martingale players; the cap mostly limits damage from one lucky big bettor. So don't say "limits exist to stop Martingale".
- Src: https://en.wikipedia.org/wiki/Martingale_(betting_system) ; https://en.wikipedia.org/wiki/Table_limit

### 4. Casinos want players to win sometimes — PARTLY (careful)
- TRUE as a mechanism: games pay back most of the money (Nevada slots avg hold ~7%, i.e. ~93% returned) and frequent small wins sustain play. Dixon et al. 2010 show multi-line slots raise the *rate of reinforcement* mainly via small returns below the bet.
- Skinner proposed (1953) that near-misses/conditioned reinforcement could keep people playing; BUT a 2019 review with new experiments (Pisklak, Yong & Spetch, J Gambling Studies) found NO support for a near-miss effect on persistence. Variable-ratio schedules resist extinction is mainstream psychology, but I found no primary slot-specific Skinner source — do not claim "Skinner proved slots work this way".
- Safe wording: "Small wins keep you playing. The casino is fine with that, because the edge is paid on every bet."
- Src: https://pubmed.ncbi.nlm.nih.gov/31522339/ (Pisklak et al., near-miss review); https://www.covers.com/industry/study-finds-nevada-slot-machines-gradually-paying-out-less-jan-21-2026 (UNLV: avg hold 7.1% in 2025)

### 5. Progressive jackpots funded by slice of each bet — TRUE
- A linked-jackpot controller adds a set proportion of each wager to the pot (patent description US 5,564,700). Nevada sets a minimum growth rate for inter-casino linked pots: 0.4% of wagers (regulator has recommended cutting to 0.1%, news July 2026, not yet adopted at time of source). Most other jurisdictions already allow 0.1%. Pot is usually seeded by the casino.
- Src: https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5564700 ; https://lowerbuckstimes.com/2026/07/16/nevada-progressive-slot-rule-change/ (news, not reg text)

### 6. "House always wins" but can lose a day — PARTLY (nuance, real example)
- Real example: April 2017, Wynn Palace (Macau). Clients of a junket (Suncity, per Fortune's sources) won enough at baccarat that the casino lost over $10 million that month. Steve Wynn: "probably the most unique statistical anomaly in my 50 years." Src: https://fortune.com/2017/07/29/casino-mogul-steve-wynn-lost-baccarat
- Pattern: Las Vegas Sands blamed Q1 2011 hold decline on Asian baccarat players winning; Wynn blamed Q2 2012 low baccarat hold as "short-term". Src: https://www.aol.com/news/2012-07-20-wynn-resorts-craps-out-on-bad-luck.html. Q3 2007 Sands net loss partly blamed on "bad luck" in Macau VIP baccarat (Asian Gaming magazine via search summary; not opened — treat as lead).
- Full-year company results still follow the edge. Best phrasing: "A casino can lose a month. It almost never loses a year."
- Honest caveat: I did not find an example where a big casino reported a whole-quarter loss only because of luck; Wynn April 2017 is one MONTH at one property.

## Extra facts (verified)
1. **Numbers 0-36 sum to 666 — TRUE (arithmetic: 36*37/2 = 666).** Nickname "Devil's wheel" is folklore; the American 00 adds zero so the sum is the same. The "monk/origin story" is legend. Src: https://www.casino.org/blog/five-things-you-probably-didnt-know-about-roulette/
2. **Monte Carlo, 18 Aug 1913: ball landed on black 26 times in a row — TRUE (as reported).** Chance of a run of 26 of one colour (either) ≈ 1 in 68.4 million per Wikipedia (I get the same: 2*(18/37)^26). Players bet on red, "lost millions of francs." Already used elsewhere — do not reuse. Src: https://en.wikipedia.org/wiki/Gambler%27s_fallacy
3. **Card counting is legal but casinos can ban you — TRUE.** US/Nevada: counting in your head is not illegal; casinos may refuse/expel players. Exception: Atlantic City (NJ Supreme Court, Uston v. Resorts International, 1979: only the Casino Control Commission can exclude skilled players), so AC casinos use countermeasures like shuffling. UK: also legal, casinos may still expel. A good counter has ~1% edge over the house. Src: https://en.wikipedia.org/wiki/Card_counting
4. **House edge ranking (optimal play, plain list) — TRUE:** blackjack ~0.28% (liberal Vegas rules; worse on bad rules) < baccarat banker 1.06% < craps pass 1.41% < roulette 2.70% (Europe) / 5.26% (US) < slots 2-15% < Big Six wheel 11-24% < keno 25-29%. Baccarat tie bet 14.36%. Edge depends on rules/paytable. Src: https://wizardofodds.com/gambling/house-edge/
5. **Small edge, huge repeat — computed:** at 2.7% edge, every $1,000,000 bet is about $27,000 for the house. At 0.28% (blackjack) about $2,800.
6. **Table limits are yield management, not only anti-Martingale — TRUE.** Wikipedia: limits can be changed to optimise profit per table; real risk is a lucky big bettor, not a doubler. Src: https://en.wikipedia.org/wiki/Table_limit

## Myths to avoid
- "Casinos rig the wheel / need to cheat." Edge is in the rules; a fair wheel is enough.
- "Casinos stop Martingale with limits" as the main reason (see Table limit).
- "Black came up 5 times, red is due" (gambler's fallacy; the 1913 story is the example).
- "Skinner proved slot near-misses keep people playing" (contested; Pisklak 2019).
- "Wynn/Sands lost a quarter because of one gambler" — only one month at one property is documented.
- "House edge 2.7%" applies to straight-up AND all bets except French half-back rules; US wheel is 5.26%, not 2.7%.
- Devil's wheel/666 as a real origin story.

## Best 6 facts for a simple 55-second film
1. A roulette wheel has 37 slots, but it pays you as if it had only 36. The green zero is the casino's whole edge.
2. That gap is 2.7 cents on every dollar. On the American wheel, with two greens, it is 5.3 cents.
3. One player can win big. But after 1,000,000 spins, the chance that the player is still ahead is about 1 in 500,000.
4. Doubling your bet after every loss does not work. Ten losses in a row costs 1,023 times your first bet.
5. In 1913 at Monte Carlo, black came up 26 times in a row. People bet on red and lost millions of francs. (Used elsewhere — swap if repeated.)
6. A casino can lose a month: in April 2017 one Macau casino lost over $10 million at baccarat. The edge still wins over time.
(Spare: all roulette numbers add up to 666; card counting is legal but casinos can throw you out.)

