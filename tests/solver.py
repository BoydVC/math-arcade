#!/usr/bin/env python3
"""Independent solver for Vic's Math Arcade. Re-derives every answer from the problem's raw numbers using
Python's exact Fraction arithmetic. It shares no code with web/gen.js. It also checks that those numbers
actually appear in the prompt the kid sees, so the params can't silently disagree with the text."""
from fractions import Fraction as Fr
from decimal import Decimal, ROUND_HALF_UP
import json, sys

def fr(v):
    if isinstance(v, list): return Fr(v[0], v[1])
    if isinstance(v, str): return Fr(Decimal(v))
    return Fr(v)

def fmt_frac(x):
    x = fr(x); return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"
def fmt_mixed(x):
    x = fr(x)
    if x.denominator == 1: return str(x.numerator)
    w, r = divmod(abs(x.numerator), x.denominator)
    return ("-" if x < 0 else "") + (f"{w} " if w else "") + f"{r}/{x.denominator}"

def solve(p):
    k, P = p["kind"], p["params"]; must = []  # strings that must appear in the prompt
    if k == "r_equiv": a, b, c = P["a"], P["b"], P["c"]; must = [f"{a} : {b}", f"{c} : ?"]; ans = Fr(b) * Fr(c, a)
    elif k == "r_simplify":
        g = Fr(P["big1"], P["big2"]); must = [f'{P["big1"]} : {P["big2"]}', f'{P["small1"]} : ?']
        assert g.numerator == P["small1"], "simplify mismatch"; ans = Fr(g.denominator)
    elif k == "r_wins": must = [f'win {P["w"]} games', f'every {P["l"]} game', f'won {P["W"]} games']; ans = Fr(P["W"] * P["l"], P["w"])
    elif k == "r_partwhole": must = [f'{P["a"]} : {P["b"]}', f'{P["T"]} in all']; ans = Fr(P["T"] * P["b"], P["a"] + P["b"])
    elif k == "r_shots": must = [f'scores {P["goals"]} goal', f'every {P["shots"]} shots', f'score {P["G"]} goals']; ans = Fr(P["G"] * P["shots"], P["goals"])
    elif k == "r_table": must = [f'{P["a"]} : {P["b"]}', f'{P["top"]} : ?']; ans = Fr(P["top"] * P["b"], P["a"])
    elif k == "u_goals": must = [f'scored {P["G"]} goals in {P["n"]} games']; ans = Fr(P["G"], P["n"])
    elif k == "u_price": must = [f'pack of {P["n"]} ', f'${P["total"]}']; ans = fr(P["total"]) / P["n"]
    elif k == "u_convert": must = [f'{P["q"]} ']; ans = Fr(P["q"] * P["factor"]) if P["dir"] == "mul" else Fr(P["q"], P["factor"])
    elif k == "p_of": must = [f'{P["P"]}% of {P["W"]}']; ans = Fr(P["P"], 100) * P["W"]
    elif k == "p_percent": must = [f'made {P["h"]} of {P["ab"]}']; ans = Fr(P["h"] * 100, P["ab"])
    elif k == "p_whole": must = [f'{P["part"]} is {P["P"]}%']; ans = Fr(P["part"] * 100, P["P"])
    elif k == "u_batavg":
        must = [f'{P["hits"]} hits in {P["ab"]} at-bats']
        q = (Decimal(P["hits"]) / Decimal(P["ab"])).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP); ans = Fr(q)
    elif k in ("f_div", "f_mixed"):
        x, y = fr(P["x"]), fr(P["y"]); f = fmt_mixed if k == "f_mixed" else fmt_frac; must = [f"{f(x)} ÷ {f(y)}"]; ans = x / y
    elif k == "f_whole":
        w, y = Fr(P["w"]), fr(P["y"]); must = [f"{P['w']} ÷ {fmt_frac(y)}" if P["order"] == "w/y" else f"{fmt_frac(y)} ÷ {P['w']}"]
        ans = w / y if P["order"] == "w/y" else y / w
    elif k == "f_laps": d, l = fr(P["dist"]), fr(P["lap"]); must = [f"is {fmt_frac(l)} mile", f"make {fmt_mixed(d)} mile"]; ans = d / l
    elif k == "f_share": a = fr(P["amt"]); must = [f'{P["ppl"]} teammates share {fmt_frac(a)}']; ans = a / P["ppl"]
    elif k in ("d_add", "d_sub"):
        a, b = fr(P["a"]), fr(P["b"]); sym = "+" if P["op"] == "+" else "−"; must = [f'{P["a"]} {sym} {P["b"]}']; ans = a + b if P["op"] == "+" else a - b
    elif k == "d_mul": must = [f'{P["a"]} × {P["b"]}']; ans = fr(P["a"]) * fr(P["b"])
    elif k == "d_div": must = [f'{P["a"]} ÷ {P["b"]}']; ans = fr(P["a"]) / fr(P["b"])
    elif k == "d_longdiv": must = [f'{P["N"]} ÷ {P["dsr"]}']; ans = Fr(P["N"], P["dsr"])
    elif k == "d_cost":
        price = fr(P["price"]); must = [f'buys {P["qty"]} ', "$%.2f each" % float(price)]; ans = price * P["qty"]
    elif k == "i_opposite": must = [f'opposite of {P["v"]}?']; ans = Fr(-P["v"])
    elif k == "i_abs": must = [f'|{P["v"]}|']; ans = Fr(abs(P["v"]))
    elif k == "i_temp": must = [f'was {P["lo"]}°F', f'it was {P["hi"]}°F']; ans = Fr(P["hi"] - P["lo"])
    elif k == "i_elev": must = [f'at {P["a"]} ft', f'at {P["b"]} ft']; ans = Fr(P["b"] - P["a"])
    elif k == "i_coord":
        (x1, y1), (x2, y2) = P["p1"], P["p2"]; must = [f"({x1}, {y1})", f"({x2}, {y2})"]
        assert x1 == x2 or y1 == y2, "points not aligned"; ans = Fr(abs(x1 - x2) + abs(y1 - y2))
    elif k in ("i_order", "i_farthest"):
        S = P["set"]; must = [P["ask"]]
        tgt = min(S) if P["ask"] == "least" else max(S) if P["ask"] == "greatest" else max(S, key=abs)
        assert sum(1 for s in S if abs(s) == abs(tgt)) == 1 or P["ask"] != "farthest from 0", "farthest tie"
        return {"choice_value": str(tgt), "must": must}
    elif k == "e_exp": must = [f'{P["b"]}^{P["e"]} + {P["c"]}']; ans = Fr(P["b"] ** P["e"] + P["c"])
    elif k == "e_eval": must = [f'{P["a"]}x + {P["c"]}', f'x = {P["x"]}']; ans = Fr(P["a"] * P["x"] + P["c"])
    elif k == "e_eval2": must = [f'{P["a"]}x² − {P["c"]}', f'x = {P["x"]}']; ans = Fr(P["a"] * P["x"] ** 2 - P["c"])
    elif k == "e_add": must = [f'x + {P["p"]} = {P["q"]}']; ans = fr(P["q"]) - fr(P["p"])
    elif k == "e_mul": must = [f'{P["p"]}x = {fmt_frac(fr(P["q"]))}']; ans = fr(P["q"]) / P["p"]
    elif k == "e_distrib": must = [f'{P["m"]}(x + {P["t"]})']; ans = Fr(P["m"] * P["t"])
    elif k == "e_factor": must = [f'{P["A"]}x + {P["B"]} = {P["g"]}({P["u"]}x']; ans = Fr(P["B"], P["g"]); assert P["A"] == P["g"] * P["u"]
    elif k == "e_word": must = [f'{P["more"]} more', f'x + {P["more"]} = {P["total"]}']; ans = Fr(P["total"] - P["more"])
    elif k == "g_square": must = [f'sides of {P["s"]} feet']; ans = Fr(P["s"] ** 2)
    elif k == "g_rect_field": must = [f'{P["l"]} yards long', f'{P["w"]} yards wide']; ans = Fr(P["l"] * P["w"])
    elif k == "g_tri": must = [f'base of {P["b"]} cm', f'height of {P["h"]} cm']; ans = Fr(P["b"] * P["h"], 2)
    elif k == "g_para": must = [f'base {P["b"]} m', f'height {P["h"]} m']; ans = Fr(P["b"] * P["h"])
    elif k == "g_trap": must = [f'{P["b1"]} ft and {P["b2"]} ft', f'height of {P["h"]} ft']; ans = Fr(P["b1"] + P["b2"]) * P["h"] / 2
    elif k == "g_prism": must = [f'{P["l"]} in long', f'{P["w"]} in wide', f'{P["h"]} in tall']; ans = fr(P["l"]) * fr(P["w"]) * fr(P["h"])
    elif k == "g_prism_frac":
        l, w, h = fr(P["l"]), fr(P["w"]), fr(P["h"]); must = [f"{fmt_mixed(l)} ft by {fmt_mixed(w)} ft by {fmt_mixed(h)} ft"]; ans = l * w * h
    elif k == "g_sa": l, w, h = P["l"], P["w"], P["h"]; must = [f"{l} in × {w} in × {h} in"]; ans = Fr(2 * (l * w + l * h + w * h))
    elif k in ("s_mean", "s_mad", "s_median", "s_median_even", "s_range"):
        D = sorted(P["data"]); n = len(D); must = [", ".join(map(str, P["data"]))]
        mean = Fr(sum(D), n)
        if k == "s_mean": ans = mean
        elif k == "s_mad": ans = sum(abs(Fr(v) - mean) for v in D) / n; must.append(f"mean is {fmt_frac(mean)}")
        elif k == "s_range": ans = Fr(D[-1] - D[0])
        else: ans = Fr(D[n // 2]) if n % 2 else Fr(D[n // 2 - 1] + D[n // 2], 2)
        if k == "s_median": assert n % 2 == 1
        if k == "s_median_even": assert n % 2 == 0
    elif k == "s_missing":
        must = [f'mean is {P["mean"]}', ", ".join(map(str, P["data"]))]; ans = Fr(P["mean"] * P["n"] - sum(P["data"]))
        assert len(P["data"]) == P["n"] - 1
    else:
        raise KeyError("unknown kind " + k)
    return {"value": ans, "must": must}

def verify(p):
    """Returns None if OK, else an error string."""
    try:
        s = solve(p)
    except Exception as e:
        return f"solver error: {e!r}"
    for m in s["must"]:
        if m not in p["prompt"]: return f"prompt missing {m!r}"
    a = p["answer"]
    if "choice_value" in s:
        if a["type"] != "choice": return "expected choice"
        if a["choices"][a["index"]] != s["choice_value"]: return f"choice {a['choices'][a['index']]} != {s['choice_value']}"
        if len(set(a["choices"])) != len(a["choices"]): return "duplicate choices"
        return None
    if a["type"] != "num": return "expected num"
    gen = Fr(a["n"], a["d"])
    if gen != s["value"]: return f"generator {gen} != solver {s['value']}"
    if s["value"] < 0 and p["kind"] not in ("i_opposite",): return "negative answer outside integer topic"
    return None

if __name__ == "__main__":
    probs = json.load(sys.stdin); bad = [(p["id"], verify(p)) for p in probs]; bad = [b for b in bad if b[1]]
    print(json.dumps({"n": len(probs), "bad": bad[:20], "nbad": len(bad)}))
