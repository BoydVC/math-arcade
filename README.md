# Vic's Math Arcade 🏟️

An arcade-style practice game for **6th-grade math**, built for Vic (Green Hornets ⚽, baseball ⚾).
It's one offline HTML file with no accounts, no network calls, and no ads. Progress saves in the browser and exports as JSON.

* **Play:** http://localhost:4255/ (served from `dist/`), or open `dist/vics-math-arcade.html` directly. It works offline from a file or USB stick.
* **Best screenshot:** `screenshots/00-best-home-desktop.png`

## Topics (8), standards, and bosses

| Topic | Common Core Grade 6 | Maryland MCCRS (2025) cluster | Boss | Problem types |
|---|---|---|---|---|
| ⚖️ Ratios & Rates | 6.RP.A.1, 6.RP.A.3a | 6.AT.A | The Ratio Rhino | equivalent ratios, simplify, win:loss, part-whole, shots:goals, ratio tables |
| 💯 Unit Rates & Percents | 6.RP.A.2, 6.RP.A.3b–d | 6.AT.A | Captain Percent | goals per game, unit price, unit conversion, % of, what %, find the whole, batting average (.xxx) |
| 🍕 Fraction Division | 6.NS.A.1 | 6.NOS.A | The Fraction Phantom | fraction ÷ fraction, whole ÷ fraction, laps, sharing, mixed numbers |
| 🔢 Multi-Digit & Decimals | 6.NS.B.2, 6.NS.B.3 | 6.NOS.B | Decimal Dragon | decimal + − × ÷, long division, cost problems |
| 🌡️ Integers & Number Line | 6.NS.C.5–8 | 6.NOS.C | Sub-Zero Slugger | opposites, absolute value, temperature, elevation, coordinate distance, ordering, farthest from 0 |
| 🧩 Expressions & Equations | 6.EE.A.1–3, 6.EE.B.7 | 6.AT.B, 6.AT.C | The Variable Viper | exponents, evaluate, distribute, factor, x + p = q, px = q, word equations |
| 📐 Area & Volume | 6.G.A.1, 6.G.A.2, 6.G.A.4 | 6.GR.A | Groundskeeper Giant | field/rectangle, square, triangle, parallelogram, trapezoid, prism (incl. fractional edges), surface area |
| 📊 Stats: Mean & Median | 6.SP.A.3, 6.SP.B.5c | 6.DS.A, 6.DS.B | Stat Monster | mean, MAD, median (odd/even), range, missing value for a target mean |

There are 53 problem kinds in all, and each problem shows its exact CCSS code.

**About Maryland:** Maryland's math standards ("MCCRS", based on Common Core) were **revised and adopted July 29, 2025, starting in school year 2026–27**. That's Vic's 6th-grade year. The revision renames the domains (for example RP→AT, NS→NOS, G→GR, SP→DS). The game shows the CCSS code on every problem plus the closest matching MCCRS **cluster** from MSDE's Grade 6 crosswalk. The mapping is at the cluster level, not one-to-one by standard.

Sources (reachable when checked Wed Oct 7, 2026 at 5:54 PM ET):
* Common Core Grade 6 Math: https://www.thecorestandards.org/Math/Content/6/
* MSDE revised MCCRS math page: https://marylandpublicschools.org/about/pages/dcaa/math/revised-standards.aspx
* MSDE Grade 6 crosswalk: https://marylandpublicschools.org/about/Documents/DCAA/Math/revised/Grade-6-MCCRS-Math-Crosswalk-A.pdf
* MSDE Grade 6 companion guide: https://marylandpublicschools.org/about/Documents/DCAA/Math/revised/Grade-6-MCCRS-Math-Standards-Companion-Guide-A.pdf

## Modes
* **⚡ Quick 10.** 10 problems, either mixed across all 8 topics or from one topic. Scoring 7+ earns +20 XP, and a perfect 10 earns +40.
* **⏱️ Timed Blitz.** 90 seconds, endless problems. Each streak adds combo XP (+2 per streak step, up to +10).
* **👾 Boss Battles.** One boss per topic, using level-3 problems only. Each right answer deals 1 damage (bosses have 8 HP). You have 3 lives. A win earns +100 XP.

## Game feel
* **XP and levels.** Each correct answer earns 10 × the problem level. A miss earns 1 XP for trying. XP needed for each level grows as 50·L·(L−1). Titles run from Rookie to Math GOAT.
* **Topic levels (★).** Topics move to level 2 at 12 correct answers and level 3 at 30. Higher levels use bigger numbers and harder problem kinds.
* **Hints with worked steps.** Hints reveal the solution steps one at a time, and using one halves the XP for that problem. After a miss, the full worked solution appears.
* **Stadium themes to unlock:**
  * Backyard Field (default)
  * Sandlot Diamond (200 XP)
  * Hornets' Nest Pitch (500 XP)
  * Night Game Lights (beat any boss)
  * Rainy Day Dome (3 blitzes)
  * Retro Arcade (1,500 XP)
  * Championship Stadium (4 bosses)
  * Space Station Arena (all 8 bosses)
* **Extras:** confetti, floating XP, sports cheers, keypad on phones and tablets, and 1–4 keys for multiple-choice questions.
* **Answers can be typed** as `3/4`, `1 1/2`, `0.75`, `-5`, `$4.50`, `25%`, or `12 goals`. Fractions are compared exactly, so 6/8 = 3/4 = 0.75.

## Data and privacy
* Every word problem uses **made-up names and teams with generic numbers**, such as "the Owls", "Maya", or "a made-up batting average". There are **no real kids' stats** and nothing about Vic's actual teams.
* Progress stays in `localStorage` (`vic-math-arcade-v1`) on the device. **Progress → Export** downloads a JSON file containing `summary` (per-topic accuracy, boss wins, XP) and `_state` (every session and every problem with its prompt, the answer given, the correct answer, and the standard). **Import** restores it.

## How correctness is checked
Problems are generated from seeds (`web/gen.js`, using the mulberry32 PRNG). Arithmetic is exact: fractions are kept as integer n/d, and decimals use scaled integers, so floating-point errors can't creep in. A problem's id `topic-level-seed` rebuilds it exactly.

`tests/solver.py` is a **separate Python solver**. It uses `fractions.Fraction`, and Decimal ROUND_HALF_UP for batting averages. For each problem it:
1. recomputes the answer from the problem's raw numbers, and
2. confirms those numbers actually appear in the prompt text, so a prompt can't say one thing while the key says another.

`tests/smoke_test.py` (63 checks):
* **1,000 problems per topic (8,000 total)** are re-solved independently.
* The in-game checker accepts correct answers in both canonical and n/d form, and rejects wrong ones.
* Every problem has worked steps and a CCSS code.
* The same seed always produces the same problems.
* The `dist/` file is offline and self-contained.
* **Headless play** (`tests/play.mjs`, Chrome over the DevTools protocol) plays the real page using answers typed from the Python solver, never from the page's own answer key. It runs a Quick 10 (8/10 right and 2 deliberately wrong, checking the XP math), a hinted answer at half XP, a boss win that unlocks a theme, a boss loss after 3 misses, a real 90-second blitz, and a theme switch. It then checks that a reload keeps the progress and that the export JSON's XP matches the sum of the sessions. About 125 problems are answered in-browser with 0 feedback mismatches and 0 JS errors.
* All screenshots exist.

## Files
```
web/gen.js        problem generator + answer checker (browser + Node)
web/app.js        game UI (modes, XP, themes, hints, save/export)
web/app.css, web/index.html
build.py          inlines everything into dist/index.html and dist/vics-math-arcade.html
run.sh            build → test → serve :4255   (--quick skips headless play, --shots re-shoots)
tests/solver.py   independent solver;  tests/solve_serve.py  line server for headless play
tests/dump.js     dumps N problems/topic for the solver
tests/cdp.mjs, tests/play.mjs, tests/screens.mjs   headless Chrome driver, play test, screenshots
screenshots/      desktop (1280×800), tablet (820×1180), phone (390×844)
```
The game-feel patterns (level curve, confetti, floating XP, toast, export dialog) were adapted from `/workspace/tokenmax/hspt-quest`. That folder was read but not modified.


---
## Repo notes
- **Built:** Oct 7, 2026, by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/math-arcade` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
