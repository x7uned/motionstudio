# Fact check: «How a slot machine decides»

Checked 2026-10-27 with web search/fetch. Where I only saw an abstract or a search summary, it says so. "Unverified" = do not put in the film as fact.

## Claims

### 1. RNG runs all the time; outcome fixed at the press; reels are display; no "hot/due" machine — TRUE (practical effect)
- A patent description says the RNG keeps generating numbers even when nobody plays, and the number present at the instant of the pull picks the reel combination (USPTO 9,293,004). Other pages say the latest number is read at the press; both give the same result: the outcome is fixed at the press, the spinning is animation.
- Regulators require this: Nevada Reg. 14.040 requires a random selection process for each play, and every combination must be available at the start of each play (Board notice). That selection covers everything from game start to the displayed result. UK Gambling Commission RTS 7 requires demonstrably random outcomes and bans "compensated"/adaptive games (online/remote standard).
- So a machine cannot be "due"; past spins do not change the next. (I found no regulator sentence saying exactly "past spins don't matter", but "adaptive games not permitted" is the UK equivalent.)
- Src: https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9293004 ; https://www.gamblingcommission.gov.uk/manual/remote-gambling-and-software-technical-standards/rts-7-generation-of-random-outcomes ; Nevada notice https://www.gaming.nv.gov/uploadedFiles/gamingnvgov/content/about/industry-notices/2012-51.pdf (secondhand quote via lasvegasadvisor.com for the exact 14.040.2 wording).

### 2. Virtual reel mapping (Telnaes, 1984) & near-misses — TRUE, with legal nuance
- US patent 4,448,419, Inge S. Telnaes, issued 15 May 1984, assigned to IGT. RNG picks from more numbers than the reel has physical stops; example in patent: 44 numbers over 22 stops. Payout odds change by software, not hardware. The patent itself is about this mapping, not about "cheating".
- Harrigan (2008, Int. J. Mental Health & Addiction, doi 10.1007/s11469-007-9066-8): manufacturers used virtual reels and "award symbol ratios" so top symbols appear just above/below the payline more often than a plain equal-stop reel would. 1988-89 Nevada Gaming Commission case: one maker's algorithms producing many near-misses ON the payline were "unacceptable"; near-misses above/below the payline via virtual mapping were acceptable.
- Nevada: older Reg. 10.040(2) (now in Reg. 14) bans the deceptive version: all combinations must be available for random selection each play. UK RTS 7C (remote games) says game designs that may mislead about outcome likelihood are not allowed, naming substituting losing results with near-miss losing results. Land-based UK machines have their own standards — I did not check them.
- Be precise: near-misses above/below the line from reel weighting are legal in Nevada; swapping a result to fake a near miss is not.
- Science caveat: whether near-misses keep people playing is contested (Pisklak 2019 found no effect in pigeons/human tests; some systematic reviews find motivation to continue).
- Src: https://patents.google.com/patent/US4448419 ; https://www.springermedicine.com/slot-machine-structural-characteristics-creating-near-misses-usi/21783820 ; https://pubmed.ncbi.nlm.nih.gov/31522339/

### 3. Losses disguised as wins (LDW) — TRUE
- Citation: Dixon MJ, Harrigan KA, Sandhu R, Collins K, Fugelsang JA (2010). "Losses disguised as wins in modern multi-line video slot machines." Addiction 105(10):1819-1824. (Citation confirmed by search summaries; I could not open the PDF text. DOI believed 10.1111/j.1360-0443.2010.03050.x — unverified.)
- Finding: 40 novice players; skin-conductance responses were similar for wins and LDWs, both larger than for plain losses. Multi-line play (min bet on max lines) raises how often a win-style display appears without raising payback. Sample = novices.
- Example (plain): bet $1, get $0.50 back, lights and jingle play. Dixon team uses the same type of example (win 30c, lose 60c, jingle still plays).
- Src: https://uwaterloo.ca/reasoning-decision-making-lab/sites/default/files/uploads/files/DixFugetal_10c.pdf ; https://uwaterloo.ca/news/news/music-gamblers-ears

### 4. Stop button gives an illusion of control — TRUE (outcome unchanged), effect size PARTLY
- On RNG machines the result was chosen at the press, so the stop button changes nothing about it (by consequence of claim 1; I found no source about stop buttons specifically).
- Ladouceur & Sévigny (2005), J Gambling Studies 21:117-131 (doi 10.1007/s10899-005-3028-5): players with a stop device believed they had more control and more skill, and played more games. A later UBC study found no clear link between stopper use and illusion of control — mixed.
- Src: https://link.springer.com/doi/10.1007/s10899-005-3028-5

### 5. Slots are the biggest earner — TRUE
- Nevada 2024: slots $10.52B = 67.3% of $15.61B total gaming win (NGCB data, UNLV copy); 127,176 machines. 2023: ~$10.3B of ~$15.5B (about two-thirds, my division). Older: 61% in 2014, 65% in 2007.
- US: Wikipedia says slots give ~70% of the average US casino's income (secondary). AGA: traditional casino gaming (slots + tables) = $49.78B of $71.92B total commercial gaming in 2024; slots alone ~$36B per a Review42 summary (not seen in AGA release — unverified).
- Src: https://gaming.library.unlv.edu/reports/2024NevadaGamingWin.pdf ; https://casinobeats.com/2025/02/04/nevada-sets-new-gaming-revenue-record-in-2024/ ; https://www.americangaming.org/new/2024-commercial-gaming-revenue-reaches-71-9b-marking-fourth-straight-year-of-record-revenue/

### 6. Payback set in software/chip; changing needs regulator approval — PARTLY
- TRUE: theoretical payout is written into the game software/firmware (often EPROM chip); changing it means swapping chip/software; one chip can hold several programs. Rare in practice; casinos set it and leave it. (Frank Legato quoted in lasvegasadvisor.com.)
- NOT TRUE as stated: Nevada Gaming Control Board spokesman (2021): "Changes to a slot machine's hold percentage do not require GCB approval"; the casino must document it. Limits: payback must be a mathematically demonstrable % of wagers, minimum 75% for each wager (Reg. 14.040), and the program must be an approved one.
- Other minimums (Wikipedia, secondary): New Jersey 83%, Mississippi 80%, UK pub machines 70%.
- Real-world: UNLV study — Nevada average hold rose 6.55% (2004) to ~7.1% (2025); i.e. ~93% returned.
- Src: https://www.lasvegasadvisor.com/question/change-hold-percentage-slots/ ; https://www.covers.com/industry/study-finds-nevada-slot-machines-gradually-paying-out-less-jan-21-2026 ; https://en.wikipedia.org/wiki/Slot_machine

### 7. Sounds — C major MYTH/unverified; sound effect TRUE
- "Tuned to C major": only found a record-label liner note anecdote (Tobira Records, gas "november 89") saying designers once used C major, "no longer strictly followed". No manufacturer or paper. UNVERIFIED — do not use.
- "Nearby machines' win sounds make everyone seem to win": plausible, mentioned in design discussions, but I found NO source. UNVERIFIED.
- Dixon et al. (2014): "The impact of sound in modern multiline video slot machine play," J Gambling Studies 30(4) (online 2013; page numbers unverified). 96 gamblers on a simulator, programmed to win 28 of 200 spins; asked how many wins. Overestimate of wins was 24% with sound vs 15% without; arousal higher with sound. Win sounds also play on LDWs. A 2015 follow-up (Dixon, Collins, Harrigan, Graydon, Fugelsang) tested negative sounds to "unmask" LDWs (abstract only seen).
- Src: https://uwaterloo.ca/news/news/music-gamblers-ears ; https://www.springermedicine.com/the-impact-of-sound-in-modern-multiline-video-slot-machine-play/21662000

## Extra facts
1. **Liberty Bell, Charles Fey, San Francisco.** Three reels, five symbols, invented "between 1887 and 1895" (Wikipedia); an 1899 Liberty Bell is in the Nevada State Museum. Say "in the 1890s", not "1895" exactly. Src: https://en.wikipedia.org/wiki/Slot_machine
2. **Speed.** UK slots: minimum 2.5 s per spin (online; 2021 rule; Stakelogic fined £122,835 in 2025, one game ran at 1.97 s). Western Australia policy: min 3 s where a game has an unpaid feature, 5 s without. Table-style casino games online UK: 5 s. Src: https://www.gamblingcommission.gov.uk/guidance/regulatory-decisions-procedures-and-guidance-for-regulatory-hearings/proposal-2-speed-of-play ; https://www.wa.gov.au/government/publications/electronic-gaming-machines-policy. Typical land-based Vegas speed (~every 3-5 s) — unverified.
3. **"Machine zone."** Natasha Dow Schüll, Addiction by Design: Machine Gambling in Las Vegas (Princeton UP, 2012), 15 years of fieldwork: players enter a trance where worries and body awareness fade. Book also covers ergonomics, floor layout, player tracking. Chair/spin-speed specifics: not confirmed from a source I could open. Src: https://muse.jhu.edu/book/61897
4. **Virtual reel size.** A virtual reel with 256 stops per reel gives 16,777,216 final positions (3 reels: 256^3). Src: Wikipedia Slot_machine.
5. **Credits hide dollars.** Money usually shown as credits (Harrigan slide deck, 2010 NH Gambling Commission; not peer-reviewed); a "pain of paying" experiment found only weak evidence that format changes play. PARTLY — use softly or skip.
6. **Multi-line = more fake wins.** Dixon's analysis of Lucky Larry's Lobstermania design documents: LDWs rise as more lines are played. Src: DixFugetal_10c.pdf above.
7. **Low-stake machines hold more.** Nevada average hold ~7.1% in 2025, up from 6.55% in 2004 (UNLV, via CDC Gaming/Covers).

## Myths to avoid
- "Reels' stopping position decides the result" (it is chosen first; reels animate it).
- "Hot/cold/due machine" and "the casino loosens it at night / remote switch" (changes are rare, chip/software, documented).
- "Slots are rigged to be unfair by law-breaking near-misses" — virtual-reel near-misses above/below the line are legal in Nevada; faking them is not.
- "Regulator must approve every payback change in Nevada" (GCB: not required, must be documented, approved program, >=75%).
- "Slot sounds are tuned to C major" and "neighbour win sounds are planted" — no source.
- "Dixon proved addiction" — the study measured arousal/overestimation in 40 novices.
- "Near-misses are proven to keep you playing" — contested.
- "Liberty Bell 1895" as a hard date; "slots = 70% of revenue everywhere" (Nevada 67%, US ~70% secondary).

## Best 6 facts for a simple 55-second film
1. The result is chosen the moment you press spin. The spinning reels are just a show.
2. A random number generator runs all the time, even when nobody is playing, so a machine is never "due" to pay.
3. Many slots are built so the jackpot symbol lands just above or below the line more often than plain luck would. This is legal in Nevada.
4. You bet $1, get 50 cents back, and the machine plays lights and a happy sound. Researchers call it a loss disguised as a win. Your body reacts to it like a win.
5. In one test, people who heard win sounds thought they won 24% of the time; without sound, 15%. The real number was 14%.  (28 of 200 spins = 14%; computed.)
6. Slot machines make about two thirds of all casino win in Nevada: $10.5 billion of $15.6 billion in 2024.
(Spare: the stop button feels like control but changes nothing; the first slot, Liberty Bell, was built by Charles Fey in the 1890s.)
