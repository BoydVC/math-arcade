#!/usr/bin/env python3
"""Line server for headless play: read one problem JSON per line and print the answer the
independent solver (solver.py) computes, as text a player would type (n/d), or the choice index."""
import json, sys
sys.path.insert(0, __import__("os").path.dirname(__file__))
from solver import solve, verify
for line in sys.stdin:
    p = json.loads(line); s = solve(p); err = verify(p)
    if "choice_value" in s: out = {"choice": p["answer"]["choices"].index(s["choice_value"]), "text": s["choice_value"]}
    else:
        v = s["value"]; out = {"text": str(v.numerator) if v.denominator == 1 else f"{v.numerator}/{v.denominator}",
                               "wrong": str(v.numerator + 1) if v.denominator == 1 else f"{v.numerator + v.denominator}/{v.denominator}"}
    out["verify"] = err; print(json.dumps(out), flush=True)
