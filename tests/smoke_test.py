#!/usr/bin/env python3
"""Smoke test for Vic's Math Arcade.
1. 1,000 seeded problems per topic (8,000) are re-solved by an independent Python Fraction solver
   (tests/solver.py), which also confirms the problem's numbers appear in the prompt text.
2. The in-game answer checker accepts the right answer (canonical and n/d forms) and rejects wrong ones.
3. dist/ is a single offline file (no external scripts, styles, images, or fetches).
4. Headless Chrome plays the real page (Quick 10, hint, boss win and loss, theme unlock, 90s blitz, reload
   persistence, export JSON), typing answers from the independent solver (tests/play.mjs).
5. Screenshots exist for desktop, tablet, and phone.  6. Generation is deterministic for a seed.
Usage: python3 tests/smoke_test.py [--skip-play] [--base N]"""
import json, os, re, subprocess, sys, collections
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(R)
sys.path.insert(0, os.path.join(R, "tests")); from solver import verify
res = []
def check(name, cond, info=""): res.append((bool(cond), name, info)); print(("PASS " if cond else "FAIL ") + name + (f"  [{info}]" if info else ""), flush=True)
base = int(sys.argv[sys.argv.index("--base") + 1]) if "--base" in sys.argv else 12345
probs = json.loads(subprocess.run(["node", "tests/dump.js", "1000", str(base)], capture_output=True, text=True, check=True).stdout)
by = collections.defaultdict(list)
for p in probs: by[p["topic"]].append(p)
topics = json.loads(subprocess.run(["node", "-e", "console.log(JSON.stringify(require('./web/gen.js').TOPICS))"], capture_output=True, text=True, check=True).stdout)
check("8 topics defined", len(topics) == 8, ", ".join(t["name"] for t in topics))
for t in topics:
    ps = by[t["id"]]; bad = [(p["id"], e) for p in ps for e in [verify(p)] if e]
    kinds = sorted({p["kind"] for p in ps})
    check(f'{t["name"]}: 1000 problems verified by independent solver', len(ps) == 1000 and not bad, f'{len(ps)} problems, {len(kinds)} kinds, bad={bad[:3]}')
    cb = [p["id"] for p in ps if not p.get("checker_ok")]
    check(f'{t["name"]}: in-game checker accepts right / rejects wrong', not cb, cb[:3])
    check(f'{t["name"]}: every problem has worked steps and a CCSS code', all(len(p["steps"]) >= 2 and p["std"].startswith("6.") for p in ps))
check("all problem ids unique per seed/level", len({p["id"] for p in probs}) == len(probs))
check("sports word problems present", sum(1 for p in probs if re.search(r"game|goal|batting|field|team", p["prompt"], re.I)) >= 500)
# no real people: fictional names list only
names = set(re.findall(r"\b(?:Maya|Leo|Sam|Ava|Noah|Zoe|Eli|Ruby|Max|Ivy|Kai|Nora|Jay|Lila|Ben|Mia)\b", " ".join(p["prompt"] for p in probs)))
check("word problems use fictional first names only (no last names / real stats)", not re.search(r"\b(Victor|Vic|Boyd|Hornets)\b", " ".join(p["prompt"] for p in probs)), sorted(names)[:8])
again = json.loads(subprocess.run(["node", "tests/dump.js", "50", str(base)], capture_output=True, text=True, check=True).stdout)
byid = {p["id"]: p for p in probs}
check("deterministic: same seed -> identical problems", len(again) == 400 and all(byid.get(a["id"]) == a for a in again), f"{len(again)} re-generated")
# offline snapshot
html = open("dist/vics-math-arcade.html", encoding="utf-8").read()
check("dist snapshot built and matches index.html", html == open("dist/index.html", encoding="utf-8").read() and len(html) > 50000, f"{len(html)} bytes")
check("snapshot is offline (no external src/href/fetch)", not re.search(r'<(script|link|img)[^>]+(src|href)=|fetch\(|XMLHttpRequest|@import', html))
check("snapshot cites CCSS grade 6 URL", "https://www.thecorestandards.org/Math/Content/6/" in html)
check("snapshot sends nothing (no network APIs)", not re.search(r"sendBeacon|WebSocket|navigator\.share", html))
if "--skip-play" not in sys.argv:
    pr = subprocess.run(["node", "--experimental-websocket", "tests/play.mjs"], capture_output=True, text=True, timeout=600)
    try:
        j = json.loads(pr.stdout[pr.stdout.index("{"):])
        for c in j["checks"]: check("play: " + c["name"], c["pass"], c["info"][:160])
        check("headless play answered problems", j["played"] >= 100, f'{j["played"]} problems answered in-browser')
    except Exception as e: check("headless play ran", False, (pr.stdout + pr.stderr)[-400:])
shots = os.listdir("screenshots") if os.path.isdir("screenshots") else []
for d in ("desktop", "tablet", "phone"): check(f"{d} screenshots present", sum(s.startswith(d) for s in shots) >= 8, sum(s.startswith(d) for s in shots))
check("best screenshot present", os.path.exists("screenshots/00-best-home-desktop.png"))
fails = [r for r in res if not r[0]]
print(f"\n{len(res) - len(fails)}/{len(res)} checks passed"); sys.exit(1 if fails else 0)
