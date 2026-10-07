/* Vic's Math Arcade: seeded problem generator.
   Every problem = generate(topic, seed, level). Same inputs -> same problem, always.
   Each problem carries `params` (the raw numbers) so an independent solver (tests/solver.py) can re-derive the answer.
   Works in the browser (window.MathGen) and in Node (module.exports). */
(function (root) {
  "use strict";
  // ---------- seeded RNG (mulberry32) ----------
  function rng(seed) {
    var a = seed >>> 0;
    var f = function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = function (lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    f.shuffle = function (arr) { var a2 = arr.slice(); for (var i = a2.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = a2[i]; a2[i] = a2[j]; a2[j] = t; } return a2; };
    return f;
  }
  // ---------- exact fractions ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function F(n, d) { d = d === undefined ? 1 : d; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return { n: n / g, d: d / g }; }
  function add(x, y) { return F(x.n * y.d + y.n * x.d, x.d * y.d); }
  function sub(x, y) { return F(x.n * y.d - y.n * x.d, x.d * y.d); }
  function mul(x, y) { return F(x.n * y.n, x.d * y.d); }
  function div(x, y) { return F(x.n * y.d, x.d * y.n); }
  function fracStr(x) { return x.d === 1 ? String(x.n) : x.n + "/" + x.d; }
  function mixedStr(x) { if (x.d === 1) return String(x.n); var s = x.n < 0 ? "-" : "", n = Math.abs(x.n), w = Math.floor(n / x.d), r = n % x.d; return s + (w ? w + " " : "") + r + "/" + x.d; }
  // decimals are carried as strings, computed with scaled integers
  function decF(s) { var neg = s[0] === "-"; if (neg) s = s.slice(1); var p = s.split("."), dp = p[1] ? p[1].length : 0; var n = parseInt(p[0] + (p[1] || ""), 10); return F(neg ? -n : n, Math.pow(10, dp)); }
  function decStr(x, maxdp) { // exact decimal string of a fraction whose denominator is 2^a5^b (else null)
    maxdp = maxdp || 8; for (var dp = 0; dp <= maxdp; dp++) { var sc = Math.pow(10, dp); if ((x.n * sc) % x.d === 0) { var v = Math.abs(x.n * sc / x.d), s = String(v); while (s.length <= dp) s = "0" + s; var out = dp ? s.slice(0, s.length - dp) + "." + s.slice(s.length - dp) : s; return (x.n < 0 ? "-" : "") + out; } } return null; }
  function scaledDec(units, dp) { return decStr(F(units, Math.pow(10, dp))); }
  function money(x) { var v = decStr(x); var p = v.split("."); return "$" + p[0] + "." + ((p[1] || "") + "00").slice(0, 2); }
  function numAns(x, fmt, extra) { var a = { type: "num", n: x.n, d: x.d, fmt: fmt || "auto" }; for (var k in (extra || {})) a[k] = extra[k]; a.text = ansText(a); return a; }
  function ansText(a) {
    var x = { n: a.n, d: a.d };
    if (a.round !== undefined) return a.display;
    var t = a.fmt === "money" ? money(x) : a.fmt === "mixed" ? mixedStr(x) : a.fmt === "frac" ? fracStr(x) : (decStr(x, 4) !== null ? decStr(x, 4) : fracStr(x));
    return t + (a.unit ? (a.unit === "%" ? "%" : " " + a.unit) : "");
  }
  function choiceAns(choices, index) { return { type: "choice", choices: choices, index: index, text: choices[index] }; }

  // fictional / generic names only
  var NAMES = ["Maya", "Leo", "Sam", "Ava", "Jordan", "Riley", "Kai", "Nina", "Theo", "Zoe", "Omar", "Lily", "Max", "Ivy", "Eli", "Rosa"];
  var TEAMS = ["Comets", "Falcons", "Rockets", "Sharks", "Thunder", "Owls", "Lightning", "Pioneers"];

  var TOPICS = [
    { id: "ratios", name: "Ratios & Rates", icon: "⚖️", boss: "The Ratio Rhino", cc: "6.RP.A.1, 6.RP.A.3a", md: "6.AT.A" },
    { id: "rates", name: "Unit Rates & Percents", icon: "💯", boss: "Captain Percent", cc: "6.RP.A.2, 6.RP.A.3b–d", md: "6.AT.A" },
    { id: "fractions", name: "Fraction Division", icon: "🍕", boss: "The Fraction Phantom", cc: "6.NS.A.1", md: "6.NOS.A" },
    { id: "decimals", name: "Multi-Digit & Decimals", icon: "🔢", boss: "Decimal Dragon", cc: "6.NS.B.2, 6.NS.B.3", md: "6.NOS.B" },
    { id: "integers", name: "Integers & Number Line", icon: "🌡️", boss: "Sub-Zero Slugger", cc: "6.NS.C.5–8", md: "6.NOS.C" },
    { id: "equations", name: "Expressions & Equations", icon: "🧩", boss: "The Variable Viper", cc: "6.EE.A.1–3, 6.EE.B.7", md: "6.AT.B, 6.AT.C" },
    { id: "geometry", name: "Area & Volume", icon: "📐", boss: "Groundskeeper Giant", cc: "6.G.A.1, 6.G.A.2, 6.G.A.4", md: "6.GR.A" },
    { id: "stats", name: "Stats: Mean & Median", icon: "📊", boss: "Stat Monster", cc: "6.SP.A.3, 6.SP.B.5c", md: "6.DS.A, 6.DS.B" }
  ];

  // ---------- generators: each returns {kind, std, prompt, params, answer, steps} ----------
  var G = {};

  G.ratios = function (r, L) {
    var kinds = L === 1 ? ["r_equiv", "r_simplify", "r_wins"] : L === 2 ? ["r_equiv", "r_partwhole", "r_wins", "r_shots"] : ["r_partwhole", "r_shots", "r_table", "r_wins"];
    var k = r.pick(kinds), a, b, m, c, ans;
    if (k === "r_equiv") {
      a = r.int(1, 9); b = r.int(1, 9); while (b === a) b = r.int(1, 9); m = r.int(2, L === 1 ? 6 : 12); c = a * m;
      return { kind: k, std: "6.RP.A.3a", params: { a: a, b: b, c: c }, prompt: "Fill in the equivalent ratio:  " + a + " : " + b + "  =  " + c + " : ?",
        answer: numAns(F(b * m)), steps: [c + " ÷ " + a + " = " + m + ", so the first number was multiplied by " + m + ".", "Multiply the second number by the same amount: " + b + " × " + m + " = " + (b * m) + "."] };
    }
    if (k === "r_simplify") {
      a = r.int(1, 7); b = r.int(2, 9); var g0 = gcd(a, b); a /= g0; b /= g0; if (a === b) b = a + 1; m = r.int(2, 9);
      return { kind: k, std: "6.RP.A.1", params: { big1: a * m, big2: b * m, small1: a }, prompt: "Write " + (a * m) + " : " + (b * m) + " in simplest form.  " + a + " : ?",
        answer: numAns(F(b)), steps: ["Find the greatest common factor of " + (a * m) + " and " + (b * m) + ": it's " + gcd(a * m, b * m) + ".", "Divide both numbers by it: " + (a * m) + " ÷ " + gcd(a * m, b * m) + " = " + a + " and " + (b * m) + " ÷ " + gcd(a * m, b * m) + " = " + b + "."] };
    }
    if (k === "r_wins") {
      var team = r.pick(TEAMS); a = r.int(2, 5); b = r.int(1, 4); if (gcd(a, b) > 1) b = 1; m = r.int(2, L === 1 ? 4 : 8);
      return { kind: k, std: "6.RP.A.3a", params: { w: a, l: b, W: a * m }, prompt: "The " + team + " win " + a + " games for every " + b + " game" + (b > 1 ? "s" : "") + " they lose. If they won " + (a * m) + " games this season, how many did they lose?",
        answer: numAns(F(b * m), "auto", { unit: "games" }), steps: ["Wins : losses = " + a + " : " + b + ".", (a * m) + " wins ÷ " + a + " = " + m + " groups.", "Each group has " + b + " loss" + (b > 1 ? "es" : "") + ": " + m + " × " + b + " = " + (b * m) + "."] };
    }
    if (k === "r_partwhole") {
      a = r.int(1, 6); b = r.int(1, 6); if (a === b) b++; m = r.int(2, L === 2 ? 6 : 12); var T = (a + b) * m, nm = r.pick(["soccer balls to baseballs", "girls to boys at camp", "home games to away games"]);
      return { kind: k, std: "6.RP.A.1", params: { a: a, b: b, T: T }, prompt: "The ratio of " + nm + " is " + a + " : " + b + ". There are " + T + " in all. How many are in the second group?",
        answer: numAns(F(b * m)), steps: ["Each 'group' of the ratio has " + a + " + " + b + " = " + (a + b) + " items.", T + " ÷ " + (a + b) + " = " + m + " groups.", "Second part: " + b + " × " + m + " = " + (b * m) + "."] };
    }
    if (k === "r_shots") {
      a = r.int(2, 6); b = r.int(1, a - 1); if (gcd(a, b) > 1) { a = 5; b = 2; } m = r.int(2, L === 3 ? 12 : 7); var nm2 = r.pick(NAMES);
      return { kind: k, std: "6.RP.A.3a", params: { shots: a, goals: b, G: b * m }, prompt: nm2 + " scores " + b + " goal" + (b > 1 ? "s" : "") + " for every " + a + " shots. At that rate, how many shots does " + nm2 + " need to score " + (b * m) + " goals?",
        answer: numAns(F(a * m), "auto", { unit: "shots" }), steps: ["Goals : shots = " + b + " : " + a + ".", (b * m) + " ÷ " + b + " = " + m + ", so scale up by " + m + ".", a + " × " + m + " = " + (a * m) + " shots."] };
    }
    // r_table: ratio table with a missing middle value
    a = r.int(2, 9); b = r.int(2, 9); if (a === b) b++; var x1 = r.int(2, 5), x2 = r.int(6, 12);
    return { kind: "r_table", std: "6.RP.A.3a", params: { a: a, b: b, top: a * x2 }, prompt: "Ratio table (laps : minutes):  " + a + " : " + b + "   |   " + (a * x1) + " : " + (b * x1) + "   |   " + (a * x2) + " : ?",
      answer: numAns(F(b * x2)), steps: ["Unit idea: every " + a + " laps take " + b + " minutes.", (a * x2) + " ÷ " + a + " = " + x2 + ".", b + " × " + x2 + " = " + (b * x2) + "."] };
  };

  G.rates = function (r, L) {
    var kinds = L === 1 ? ["u_goals", "u_convert", "p_of"] : L === 2 ? ["u_price", "p_of", "p_percent", "u_goals", "u_convert"] : ["p_whole", "u_batavg", "p_percent", "u_price", "p_of"];
    var k = r.pick(kinds);
    if (k === "u_goals") {
      var team = r.pick(TEAMS), n = r.int(4, 12), rateH = r.int(2, L === 1 ? 8 : 9), half = L > 1 && r() < .5; // rate in halves when half
      var rate = half ? F(2 * rateH + 1, 2) : F(rateH); if (half && n % 2) n++;
      var G2 = mul(rate, F(n)).n;
      return { kind: k, std: "6.RP.A.3b", params: { G: G2, n: n }, prompt: "The " + team + " scored " + G2 + " goals in " + n + " games. How many goals per game is that?",
        answer: numAns(rate, "auto", { unit: "goals per game" }), steps: ["Goals per game = total goals ÷ games.", G2 + " ÷ " + n + " = " + ansText({ n: rate.n, d: rate.d, fmt: "auto" }) + "."] };
    }
    if (k === "u_price") {
      var items = r.pick(["sports drinks", "baseballs", "shin guards", "granola bars"]), n2 = r.int(3, 12), cents = r.int(45, 650);
      var total = F(cents * n2, 100);
      return { kind: k, std: "6.RP.A.3b", params: { total: decStr(total), n: n2 }, prompt: "A pack of " + n2 + " " + items + " costs $" + decStr(total) + ". What's the price of one?",
        answer: numAns(F(cents, 100), "money"), steps: ["Unit price = total cost ÷ number of items.", "$" + decStr(total) + " ÷ " + n2 + " = " + money(F(cents, 100)) + "."] };
    }
    if (k === "u_convert") {
      var conv = r.pick([["yards", "feet", 3], ["feet", "inches", 12], ["minutes", "seconds", 60], ["quarts", "cups", 4], ["hours", "minutes", 60]]);
      var big = r.int(2, L === 1 ? 12 : 120), up = r() < .6;
      if (up) return { kind: "u_convert", std: "6.RP.A.3d", params: { q: big, factor: conv[2], dir: "mul" }, prompt: "A practice field is marked in " + conv[0] + ". Convert " + big + " " + conv[0] + " to " + conv[1] + ".",
        answer: numAns(F(big * conv[2]), "auto", { unit: conv[1] }), steps: ["1 " + conv[0].replace(/s$/, "") + " = " + conv[2] + " " + conv[1] + ".", big + " × " + conv[2] + " = " + (big * conv[2]) + " " + conv[1] + "."] };
      return { kind: "u_convert", std: "6.RP.A.3d", params: { q: big * conv[2], factor: conv[2], dir: "div" }, prompt: "Convert " + (big * conv[2]) + " " + conv[1] + " to " + conv[0] + ".",
        answer: numAns(F(big), "auto", { unit: conv[0] }), steps: [conv[2] + " " + conv[1] + " = 1 " + conv[0].replace(/s$/, "") + ".", (big * conv[2]) + " ÷ " + conv[2] + " = " + big + " " + conv[0] + "."] };
    }
    if (k === "p_of") {
      var P = r.pick(L === 1 ? [10, 25, 50, 20, 75] : [5, 10, 15, 20, 25, 30, 40, 60, 75, 80, 35, 45]), W = r.int(2, 40) * (L === 1 ? 4 : 2);
      var ans = mul(F(P, 100), F(W));
      return { kind: k, std: "6.RP.A.3c", params: { P: P, W: W }, prompt: "What is " + P + "% of " + W + "?",
        answer: numAns(ans), steps: [P + "% means " + P + " per 100, or " + fracStr(F(P, 100)) + ".", fracStr(F(P, 100)) + " × " + W + " = " + ansText({ n: ans.n, d: ans.d, fmt: "auto" }) + "."] };
    }
    if (k === "p_percent") {
      var ab = r.pick([10, 20, 25, 40, 50]), h = r.int(1, ab - 1), nm = r.pick(NAMES);
      var pc = F(h * 100, ab);
      return { kind: k, std: "6.RP.A.3c", params: { h: h, ab: ab }, prompt: nm + " made " + h + " of " + ab + " free throws in practice. What percent is that?",
        answer: numAns(pc, "auto", { unit: "%" }), steps: ["Percent = part ÷ whole × 100.", h + " ÷ " + ab + " = " + decStr(F(h, ab)) + ".", decStr(F(h, ab)) + " × 100 = " + ansText({ n: pc.n, d: pc.d, fmt: "auto" }) + "%."] };
    }
    if (k === "p_whole") {
      var P2 = r.pick([10, 20, 25, 40, 50, 75, 60, 5]), whole = r.int(2, 30) * 4; var part = mul(F(P2, 100), F(whole));
      if (part.d !== 1) { whole = 100; part = F(P2); }
      return { kind: k, std: "6.RP.A.3c", params: { part: part.n, P: P2 }, prompt: part.n + " is " + P2 + "% of what number?",
        answer: numAns(F(whole)), steps: [P2 + "% of the whole = " + part.n + ".", "1% of the whole = " + part.n + " ÷ " + P2 + " = " + ansText({ n: F(part.n, P2).n, d: F(part.n, P2).d, fmt: "auto" }) + ".", "100% = that × 100 = " + whole + "."] };
    }
    // u_batavg (rounded to 3 decimals)
    var ab2 = r.int(20, 120), hits = r.int(Math.round(ab2 * .15), Math.round(ab2 * .45)), nm3 = r.pick(NAMES);
    var thou = Math.round(hits * 1000 / ab2); // ties never occur? handled by solver independently
    var disp = "." + ("000" + thou).slice(-3); if (thou >= 1000) disp = "1.000";
    return { kind: "u_batavg", std: "6.RP.A.3b", params: { hits: hits, ab: ab2 }, prompt: "In a made-up season, " + nm3 + " has " + hits + " hits in " + ab2 + " at-bats. What's the batting average, rounded to three decimal places?",
      answer: { type: "num", n: thou, d: 1000, fmt: "dec", round: 3, display: disp, text: disp }, steps: ["Batting average = hits ÷ at-bats.", hits + " ÷ " + ab2 + " = " + (hits / ab2).toFixed(5) + "…", "Round to three places: " + disp + " (baseball writes it without the leading zero)."] };
  };

  G.fractions = function (r, L) {
    var kinds = L === 1 ? ["f_div", "f_whole"] : L === 2 ? ["f_div", "f_whole", "f_laps", "f_share"] : ["f_mixed", "f_laps", "f_div", "f_share"];
    var k = r.pick(kinds);
    function fr(maxd) { var d = r.int(2, maxd), n = r.int(1, d - 1); return F(n, d); }
    if (k === "f_div") {
      var x = fr(L === 1 ? 6 : 12), y = fr(L === 1 ? 6 : 12), q = div(x, y);
      return { kind: k, std: "6.NS.A.1", params: { x: [x.n, x.d], y: [y.n, y.d] }, prompt: fracStr(x) + " ÷ " + fracStr(y) + " = ?   (fraction or mixed number)",
        answer: numAns(q, "frac"), steps: ["Keep, change, flip: " + fracStr(x) + " × " + y.d + "/" + y.n + ".", "Multiply: (" + x.n + " × " + y.d + ") / (" + x.d + " × " + y.n + ") = " + (x.n * y.d) + "/" + (x.d * y.n) + ".", "Simplify: " + fracStr(q) + (q.n > q.d && q.d > 1 ? " = " + mixedStr(q) : "") + "."] };
    }
    if (k === "f_whole") {
      var w = r.int(2, 9), y2 = fr(8), first = r() < .5, q2 = first ? div(F(w), y2) : div(y2, F(w));
      var pr = first ? w + " ÷ " + fracStr(y2) : fracStr(y2) + " ÷ " + w;
      return { kind: k, std: "6.NS.A.1", params: first ? { w: w, y: [y2.n, y2.d], order: "w/y" } : { w: w, y: [y2.n, y2.d], order: "y/w" }, prompt: pr + " = ?",
        answer: numAns(q2, "frac"), steps: [first ? "Write " + w + " as " + w + "/1, then multiply by the reciprocal " + y2.d + "/" + y2.n + "." : "Dividing by " + w + " is the same as multiplying by 1/" + w + ".", "Result: " + fracStr(q2) + (q2.n > q2.d && q2.d > 1 ? " = " + mixedStr(q2) : "") + "."] };
    }
    if (k === "f_laps") {
      var lap = r.pick([F(1, 4), F(1, 2), F(3, 4), F(1, 3), F(2, 3), F(1, 5), F(2, 5), F(3, 8)]), nl = r.int(2, 12); var dist = mul(lap, F(nl));
      return { kind: k, std: "6.NS.A.1", params: { dist: [dist.n, dist.d], lap: [lap.n, lap.d] }, prompt: "A practice loop around the field is " + fracStr(lap) + " mile. How many loops make " + mixedStr(dist) + " mile" + (dist.n === dist.d ? "" : "s") + "?",
        answer: numAns(F(nl), "auto", { unit: "loops" }), steps: ["Loops = total distance ÷ one loop.", mixedStr(dist) + " = " + fracStr(dist) + ".", fracStr(dist) + " ÷ " + fracStr(lap) + " = " + fracStr(dist) + " × " + lap.d + "/" + lap.n + " = " + nl + "."] };
    }
    if (k === "f_share") {
      var amt = fr(L === 3 ? 9 : 6), ppl = r.int(2, 6); var each = div(amt, F(ppl)), thing = r.pick(["pound of sunflower seeds", "gallon of water", "pizza"]);
      return { kind: k, std: "6.NS.A.1", params: { amt: [amt.n, amt.d], ppl: ppl }, prompt: ppl + " teammates share " + fracStr(amt) + " of a " + thing + " equally. What fraction does each get?",
        answer: numAns(each, "frac"), steps: ["Each share = " + fracStr(amt) + " ÷ " + ppl + ".", fracStr(amt) + " × 1/" + ppl + " = " + fracStr(each) + "."] };
    }
    // f_mixed
    var a1 = F(r.int(1, 4) * 4 + r.int(1, 3), 4), b1 = F(r.int(1, 3) * 3 + r.int(1, 2), 3);
    a1 = F(r.int(1, 3) * a1.d + r.int(1, a1.d - 1), a1.d); var dd = r.pick([2, 3, 4, 5, 6]); b1 = F(r.int(1, 2) * dd + r.int(1, dd - 1), dd);
    var q3 = div(a1, b1);
    return { kind: "f_mixed", std: "6.NS.A.1", params: { x: [a1.n, a1.d], y: [b1.n, b1.d] }, prompt: mixedStr(a1) + " ÷ " + mixedStr(b1) + " = ?",
      answer: numAns(q3, "mixed"), steps: ["Turn mixed numbers into improper fractions: " + fracStr(a1) + " ÷ " + fracStr(b1) + ".", "Multiply by the reciprocal: " + fracStr(a1) + " × " + b1.d + "/" + b1.n + " = " + fracStr(q3) + ".", "As a mixed number: " + mixedStr(q3) + "."] };
  };

  G.decimals = function (r, L) {
    var kinds = L === 1 ? ["d_add", "d_sub", "d_longdiv"] : L === 2 ? ["d_mul", "d_longdiv", "d_add", "d_cost"] : ["d_div", "d_mul", "d_longdiv", "d_cost", "d_sub"];
    var k = r.pick(kinds);
    function dec(maxInt, dp) { return F(r.int(1, maxInt * Math.pow(10, dp)), Math.pow(10, dp)); }
    if (k === "d_add" || k === "d_sub") {
      var a = dec(L === 1 ? 50 : 500, r.int(1, 3)), b = dec(L === 1 ? 50 : 500, r.int(1, 3));
      if (k === "d_sub" && (a.n / a.d) < (b.n / b.d)) { var t = a; a = b; b = t; }
      var ans = k === "d_add" ? add(a, b) : sub(a, b), op = k === "d_add" ? "+" : "−";
      return { kind: k, std: "6.NS.B.3", params: { a: decStr(a), b: decStr(b), op: k === "d_add" ? "+" : "-" }, prompt: decStr(a) + " " + op + " " + decStr(b) + " = ?",
        answer: numAns(ans, "dec"), steps: ["Line up the decimal points (add zeros so both have the same number of places).", decStr(a) + " " + op + " " + decStr(b) + " = " + decStr(ans) + "."] };
    }
    if (k === "d_mul") {
      var a2 = dec(L === 2 ? 20 : 90, r.int(1, 2)), b2 = dec(L === 2 ? 9 : 30, r.int(1, 2)), p = mul(a2, b2);
      return { kind: k, std: "6.NS.B.3", params: { a: decStr(a2), b: decStr(b2) }, prompt: decStr(a2) + " × " + decStr(b2) + " = ?",
        answer: numAns(p, "dec"), steps: ["Multiply as if they were whole numbers, then count the total decimal places.", decStr(a2) + " × " + decStr(b2) + " = " + decStr(p) + "."] };
    }
    if (k === "d_div") {
      var dv = dec(9, r.int(1, 2)), qq = dec(L === 3 ? 60 : 20, r.int(0, 2)), dvd = mul(dv, qq);
      return { kind: k, std: "6.NS.B.3", params: { a: decStr(dvd), b: decStr(dv) }, prompt: decStr(dvd) + " ÷ " + decStr(dv) + " = ?",
        answer: numAns(qq, "dec"), steps: ["Move the decimal point in both numbers until the divisor is a whole number.", decStr(dvd) + " ÷ " + decStr(dv) + " = " + decStr(qq) + "."] };
    }
    if (k === "d_longdiv") {
      var dsr = r.int(L === 1 ? 3 : 11, L === 1 ? 9 : 48), quo = r.int(L === 1 ? 12 : 105, L === 1 ? 99 : 999), N = dsr * quo;
      return { kind: k, std: "6.NS.B.2", params: { N: N, dsr: dsr }, prompt: N + " ÷ " + dsr + " = ?",
        answer: numAns(F(quo)), steps: ["Use long division (or partial quotients).", "Check: " + dsr + " × " + quo + " = " + N + "."] };
    }
    // d_cost
    var cents = r.int(55, 995), qty = r.int(3, 24), item = r.pick(["sports drinks", "team wristbands", "packs of sunflower seeds", "practice cones"]);
    var tot = F(cents * qty, 100);
    return { kind: "d_cost", std: "6.NS.B.3", params: { price: decStr(F(cents, 100)), qty: qty }, prompt: "The team buys " + qty + " " + item + " at $" + money(F(cents, 100)).slice(1) + " each. What's the total cost?",
      answer: numAns(tot, "money"), steps: ["Total = price × quantity.", money(F(cents, 100)) + " × " + qty + " = " + money(tot) + "."] };
  };

  G.integers = function (r, L) {
    var kinds = L === 1 ? ["i_opposite", "i_abs", "i_temp"] : L === 2 ? ["i_temp", "i_elev", "i_order", "i_coord"] : ["i_coord", "i_order", "i_elev", "i_farthest", "i_temp"];
    var k = r.pick(kinds);
    if (k === "i_opposite") { var v = r.int(1, 60) * (r() < .5 ? -1 : 1); return { kind: k, std: "6.NS.C.6a", params: { v: v }, prompt: "What is the opposite of " + v + "?", answer: numAns(F(-v)), steps: ["Opposites are the same distance from 0 on opposite sides.", "The opposite of " + v + " is " + (-v) + "."] }; }
    if (k === "i_abs") { var v2 = r.int(1, 99) * (r() < .7 ? -1 : 1); return { kind: k, std: "6.NS.C.7c", params: { v: v2 }, prompt: "What is |" + v2 + "|?", answer: numAns(F(Math.abs(v2))), steps: ["Absolute value = distance from 0, so it's never negative.", "|" + v2 + "| = " + Math.abs(v2) + "."] }; }
    if (k === "i_temp") {
      var lo = -r.int(1, L === 1 ? 12 : 25), hi = r.int(0, L === 1 ? 15 : 40);
      return { kind: k, std: "6.NS.C.5", params: { lo: lo, hi: hi }, prompt: "Before an early-morning game it was " + lo + "°F. By kickoff it was " + hi + "°F. How many degrees did it warm up?",
        answer: numAns(F(hi - lo), "auto", { unit: "degrees" }), steps: ["From " + lo + " up to 0 is " + (-lo) + " degrees.", "From 0 up to " + hi + " is " + hi + " more.", (-lo) + " + " + hi + " = " + (hi - lo) + "."] };
    }
    if (k === "i_elev") {
      var below = -r.int(5, 80), above = r.int(5, 120);
      return { kind: k, std: "6.NS.C.5", params: { a: below, b: above }, prompt: "A submarine is at " + below + " ft and a drone is at " + above + " ft. How far apart are they?",
        answer: numAns(F(above - below), "auto", { unit: "ft" }), steps: ["Distance = |" + above + "| + |" + below + "| when they're on opposite sides of 0.", above + " + " + (-below) + " = " + (above - below) + " ft."] };
    }
    if (k === "i_coord") {
      var x = r.int(-9, 9), y1 = r.int(-9, 9), y2 = r.int(-9, 9); while (y2 === y1) y2 = r.int(-9, 9);
      var same = r() < .5; var P1 = same ? "(" + x + ", " + y1 + ")" : "(" + y1 + ", " + x + ")", P2 = same ? "(" + x + ", " + y2 + ")" : "(" + y2 + ", " + x + ")";
      return { kind: k, std: "6.NS.C.8", params: { p1: same ? [x, y1] : [y1, x], p2: same ? [x, y2] : [y2, x] }, prompt: "On the coordinate grid, how far is it from " + P1 + " to " + P2 + "?",
        answer: numAns(F(Math.abs(y1 - y2)), "auto", { unit: "units" }), steps: ["The points share a coordinate, so they line up " + (same ? "vertically" : "horizontally") + ".", "Distance = |" + y1 + " − " + (y2 < 0 ? "(" + y2 + ")" : y2) + "| = " + Math.abs(y1 - y2) + "."] };
    }
    if (k === "i_order" || k === "i_farthest") {
      var set = []; while (set.length < 4) { var c = r.int(-20, 20); if (set.indexOf(c) < 0 && (k !== "i_farthest" || set.every(function (s) { return Math.abs(s) !== Math.abs(c); }))) set.push(c); }
      var ask = k === "i_farthest" ? "farthest from 0" : r.pick(["least", "greatest"]);
      var target = k === "i_farthest" ? set.slice().sort(function (p, q) { return Math.abs(q) - Math.abs(p); })[0] : ask === "least" ? Math.min.apply(null, set) : Math.max.apply(null, set);
      var choices = set.map(String);
      return { kind: k, std: k === "i_farthest" ? "6.NS.C.7c" : "6.NS.C.7a", params: { set: set, ask: ask }, prompt: "Which number is the " + ask + "?",
        answer: choiceAns(choices, set.indexOf(target)), steps: [k === "i_farthest" ? "Compare absolute values: " + set.map(function (s) { return "|" + s + "| = " + Math.abs(s); }).join(", ") + "." : "On a number line, numbers to the left are less. Order: " + set.slice().sort(function (p, q) { return p - q; }).join(" < ") + ".", "Answer: " + target + "."] };
    }
  };

  G.equations = function (r, L) {
    var kinds = L === 1 ? ["e_exp", "e_eval", "e_add"] : L === 2 ? ["e_eval", "e_add", "e_mul", "e_distrib", "e_word"] : ["e_mul", "e_eval2", "e_distrib", "e_word", "e_add", "e_factor"];
    var k = r.pick(kinds);
    if (k === "e_exp") { var b = r.int(2, 6), e = b > 4 ? 2 : r.int(2, 4), c = r.int(0, 20); return { kind: k, std: "6.EE.A.1", params: { b: b, e: e, c: c }, prompt: b + "^" + e + " + " + c + " = ?", answer: numAns(F(Math.pow(b, e) + c)), steps: [b + "^" + e + " means " + Array(e + 1).join(b + " × ").slice(0, -3) + " = " + Math.pow(b, e) + ".", Math.pow(b, e) + " + " + c + " = " + (Math.pow(b, e) + c) + "."] }; }
    if (k === "e_eval") { var a = r.int(2, 9), c2 = r.int(1, 30), x = r.int(1, L === 1 ? 10 : 15); return { kind: k, std: "6.EE.A.2c", params: { a: a, c: c2, x: x }, prompt: "Evaluate " + a + "x + " + c2 + " when x = " + x + ".", answer: numAns(F(a * x + c2)), steps: ["Substitute: " + a + " × " + x + " + " + c2 + ".", (a * x) + " + " + c2 + " = " + (a * x + c2) + "."] }; }
    if (k === "e_eval2") { var a3 = r.int(2, 5), x3 = r.int(2, 6), c3 = r.int(1, Math.min(12, a3 * x3 * x3 - 1)); return { kind: k, std: "6.EE.A.2c", params: { a: a3, c: c3, x: x3 }, prompt: "Evaluate " + a3 + "x² − " + c3 + " when x = " + x3 + ".", answer: numAns(F(a3 * x3 * x3 - c3)), steps: ["Exponents first: " + x3 + "² = " + (x3 * x3) + ".", a3 + " × " + (x3 * x3) + " = " + (a3 * x3 * x3) + ".", (a3 * x3 * x3) + " − " + c3 + " = " + (a3 * x3 * x3 - c3) + "."] }; }
    if (k === "e_add") {
      var useDec = L >= 2 && r() < .5, p, q;
      if (useDec) { p = F(r.int(1, 999), 10); q = add(p, F(r.int(1, 999), 100)); }
      else { p = F(r.int(1, 40)); q = add(p, F(r.int(0, 60))); }
      var ps = useDec ? decStr(p) : String(p.n), qs = useDec ? decStr(q) : String(q.n), sol = sub(q, p);
      return { kind: k, std: "6.EE.B.7", params: { p: ps, q: qs }, prompt: "Solve:  x + " + ps + " = " + qs, answer: numAns(sol, "dec"), steps: ["Undo adding " + ps + " by subtracting it from both sides.", "x = " + qs + " − " + ps + " = " + decStr(sol) + "."] };
    }
    if (k === "e_mul") {
      var p2 = r.int(2, 12), sol2 = L === 3 && r() < .5 ? F(r.int(1, 23), r.pick([2, 3, 4, 5])) : F(r.int(1, 15)), q2 = mul(F(p2), sol2);
      var qd = q2.d === 1 ? String(q2.n) : fracStr(q2);
      return { kind: k, std: "6.EE.B.7", params: { p: p2, q: [q2.n, q2.d] }, prompt: "Solve:  " + p2 + "x = " + qd, answer: numAns(sol2, "frac"), steps: ["Undo multiplying by " + p2 + " by dividing both sides by " + p2 + ".", "x = " + qd + " ÷ " + p2 + " = " + fracStr(sol2) + (sol2.d > 1 && sol2.n > sol2.d ? " (= " + mixedStr(sol2) + ")" : "") + "."] };
    }
    if (k === "e_distrib") { var m = r.int(2, 9), t = r.int(1, 12); return { kind: k, std: "6.EE.A.3", params: { m: m, t: t }, prompt: m + "(x + " + t + ") = " + m + "x + ?", answer: numAns(F(m * t)), steps: ["Distributive property: multiply " + m + " by each term inside.", m + " × " + t + " = " + (m * t) + "."] }; }
    if (k === "e_factor") { var g = r.int(2, 9), u = r.int(2, 9), v = r.int(1, 9); while (gcd(u, v) !== 1) v++; return { kind: k, std: "6.EE.A.3", params: { A: g * u, B: g * v, g: g, u: u }, prompt: "Factor: " + (g * u) + "x + " + (g * v) + " = " + g + "(" + u + "x + ?)", answer: numAns(F(v)), steps: ["The common factor is " + g + ".", (g * v) + " ÷ " + g + " = " + v + "."] }; }
    // e_word
    var nm = r.pick(NAMES), have = r.int(3, 25), more = r.int(2, 15);
    return { kind: "e_word", std: "6.EE.B.7", params: { more: more, total: have + more }, prompt: nm + " had some goals this season, then scored " + more + " more in the playoffs for " + (have + more) + " total. Solve x + " + more + " = " + (have + more) + ".",
      answer: numAns(F(have), "auto", { unit: "goals" }), steps: ["x stands for the goals before the playoffs.", "x = " + (have + more) + " − " + more + " = " + have + "."] };
  };

  G.geometry = function (r, L) {
    var kinds = L === 1 ? ["g_rect_field", "g_tri", "g_para"] : L === 2 ? ["g_tri", "g_trap", "g_prism", "g_rect_field"] : ["g_prism_frac", "g_sa", "g_trap", "g_tri"];
    var k = r.pick(kinds);
    if (k === "g_rect_field") {
      var f = r.pick([["youth soccer field", 50, 80], ["flag football field", 30, 70], ["practice infield square", 0, 0], ["penalty area", 14, 44]]);
      if (f[1] === 0) { var s = r.pick([45, 50, 60, 65, 70, 80, 90]); return { kind: "g_square", std: "6.G.A.1", params: { s: s }, prompt: "A " + f[0] + " has sides of " + s + " feet. What is its area?", answer: numAns(F(s * s), "auto", { unit: "sq ft" }), steps: ["Area of a square = side × side.", s + " × " + s + " = " + (s * s) + " sq ft."] }; }
      var w = r.int(f[1], f[1] + 20), l = r.int(f[2], f[2] + 40);
      return { kind: k, std: "6.G.A.1", params: { l: l, w: w }, prompt: "A " + f[0] + " (made-up size) is " + l + " yards long and " + w + " yards wide. What is its area?", answer: numAns(F(l * w), "auto", { unit: "sq yd" }), steps: ["Area of a rectangle = length × width.", l + " × " + w + " = " + (l * w) + " square yards."] };
    }
    if (k === "g_tri") { var b = r.int(2, L === 1 ? 20 : 40), h = r.int(2, L === 1 ? 20 : 40); var A = F(b * h, 2); return { kind: k, std: "6.G.A.1", params: { b: b, h: h }, prompt: "A triangular pennant has a base of " + b + " cm and a height of " + h + " cm. What is its area?", answer: numAns(A, "auto", { unit: "sq cm" }), steps: ["Area of a triangle = ½ × base × height.", "½ × " + b + " × " + h + " = " + decStr(A) + " sq cm."] }; }
    if (k === "g_para") { var b2 = r.int(3, 25), h2 = r.int(2, 20); return { kind: k, std: "6.G.A.1", params: { b: b2, h: h2 }, prompt: "A parallelogram has base " + b2 + " m and height " + h2 + " m. What is its area?", answer: numAns(F(b2 * h2), "auto", { unit: "sq m" }), steps: ["Area of a parallelogram = base × height (not the slanted side!).", b2 + " × " + h2 + " = " + (b2 * h2) + " sq m."] }; }
    if (k === "g_trap") { var b1 = r.int(3, 20), bb = r.int(b1 + 1, b1 + 15), h3 = r.int(2, 16); var A3 = F((b1 + bb) * h3, 2); return { kind: k, std: "6.G.A.1", params: { b1: b1, b2: bb, h: h3 }, prompt: "A trapezoid-shaped garden by the dugout has parallel sides of " + b1 + " ft and " + bb + " ft, and a height of " + h3 + " ft. What is its area?", answer: numAns(A3, "auto", { unit: "sq ft" }), steps: ["Split it into a rectangle and triangles, or use ½ × (b₁ + b₂) × h.", "½ × (" + b1 + " + " + bb + ") × " + h3 + " = " + decStr(A3) + " sq ft."] }; }
    if (k === "g_prism") { var l2 = r.int(2, 15), w2 = r.int(2, 12), h4 = r.int(2, 10); return { kind: k, std: "6.G.A.2", params: { l: String(l2), w: String(w2), h: String(h4) }, prompt: "An equipment box is " + l2 + " in long, " + w2 + " in wide, and " + h4 + " in tall. What is its volume?", answer: numAns(F(l2 * w2 * h4), "auto", { unit: "cubic in" }), steps: ["Volume = length × width × height.", l2 + " × " + w2 + " × " + h4 + " = " + (l2 * w2 * h4) + " cubic inches."] }; }
    if (k === "g_prism_frac") { var lf = F(r.int(3, 20), 2), wf = F(r.int(2, 12), 2), hf = F(r.int(2, 9), r.pick([1, 2, 4])); var V = mul(mul(lf, wf), hf); return { kind: k, std: "6.G.A.2", params: { l: [lf.n, lf.d], w: [wf.n, wf.d], h: [hf.n, hf.d] }, prompt: "A cooler is " + mixedStr(lf) + " ft by " + mixedStr(wf) + " ft by " + mixedStr(hf) + " ft. What is its volume in cubic feet?", answer: numAns(V, "mixed", { unit: "cubic ft" }), steps: ["Volume = l × w × h, even with fractional edges.", fracStr(lf) + " × " + fracStr(wf) + " × " + fracStr(hf) + " = " + fracStr(V) + (V.d > 1 ? " = " + mixedStr(V) : "") + " cubic ft."] }; }
    var l3 = r.int(2, 12), w3 = r.int(2, 10), h5 = r.int(2, 9), SA = 2 * (l3 * w3 + l3 * h5 + w3 * h5);
    return { kind: "g_sa", std: "6.G.A.4", params: { l: l3, w: w3, h: h5 }, prompt: "You're wrapping a trophy box that is " + l3 + " in × " + w3 + " in × " + h5 + " in. How much paper covers it exactly (surface area)?", answer: numAns(F(SA), "auto", { unit: "sq in" }), steps: ["A box has 3 pairs of matching faces.", "2×(" + l3 + "×" + w3 + ") + 2×(" + l3 + "×" + h5 + ") + 2×(" + w3 + "×" + h5 + ").", "= " + (2 * l3 * w3) + " + " + (2 * l3 * h5) + " + " + (2 * w3 * h5) + " = " + SA + " sq in."] };
  };

  G.stats = function (r, L) {
    var kinds = L === 1 ? ["s_mean", "s_median", "s_range"] : L === 2 ? ["s_mean", "s_median", "s_median_even", "s_range"] : ["s_missing", "s_median_even", "s_mad", "s_mean"];
    var k = r.pick(kinds), n, data = [], i;
    var ctx = r.pick([["goals in each game", "goals"], ["points per game", "points"], ["hits per game", "hits"], ["minutes run each practice", "minutes"]]);
    if (k === "s_mean" || k === "s_mad") {
      n = r.int(4, L === 1 ? 5 : 7); var mean = r.int(2, 12); for (i = 0; i < n - 1; i++) data.push(Math.max(0, mean + r.int(-4, 4)));
      var last = mean * n - data.reduce(function (s, v) { return s + v; }, 0); if (last < 0) { data = data.map(function () { return mean; }); last = mean; } data.push(last); data = r.shuffle(data);
      if (k === "s_mean") {
        var sum = data.reduce(function (s, v) { return s + v; }, 0);
        return { kind: k, std: "6.SP.B.5c", params: { data: data }, prompt: "A player's " + ctx[0] + " (made-up numbers): " + data.join(", ") + ". What is the mean?", answer: numAns(F(sum, n)), steps: ["Add them: " + data.join(" + ") + " = " + sum + ".", "Divide by how many there are: " + sum + " ÷ " + n + " = " + decStr(F(sum, n)) + "."] };
      }
      if (data.every(function (v) { return v === data[0]; })) { data[0] += 2; data[1] = Math.max(0, data[1] - 2); }
      if (data.reduce(function (s, v) { return s + v; }, 0) !== mean * n) { data[n - 1] += mean * n - data.reduce(function (s, v) { return s + v; }, 0); }
      var m2 = F(data.reduce(function (s, v) { return s + v; }, 0), n), dev = data.map(function (v) { return Math.abs(v - m2.n / m2.d); }), mad = F(dev.reduce(function (s, v) { return s + v; }, 0) * m2.d, n * m2.d);
      return { kind: k, std: "6.SP.B.5c", params: { data: data }, prompt: "Data: " + data.join(", ") + ". The mean is " + fracStr(m2) + ". What is the mean absolute deviation (MAD)?", answer: numAns(mad), steps: ["Find each distance from the mean " + fracStr(m2) + ": " + dev.join(", ") + ".", "Add the distances: " + dev.reduce(function (s, v) { return s + v; }, 0) + ".", "Divide by " + n + ": MAD = " + (decStr(mad, 4) || fracStr(mad)) + "."] };
    }
    if (k === "s_median" || k === "s_median_even") {
      n = k === "s_median" ? r.pick([5, 7, 9]) : r.pick([4, 6, 8]); for (i = 0; i < n; i++) data.push(r.int(0, 20));
      var srt = data.slice().sort(function (p, q) { return p - q; }), med = n % 2 ? F(srt[(n - 1) / 2]) : F(srt[n / 2 - 1] + srt[n / 2], 2);
      return { kind: k, std: "6.SP.B.5c", params: { data: data }, prompt: ctx[0][0].toUpperCase() + ctx[0].slice(1) + " (made-up): " + data.join(", ") + ". What is the median?", answer: numAns(med), steps: ["Put them in order: " + srt.join(", ") + ".", n % 2 ? "The middle value is " + srt[(n - 1) / 2] + "." : "Two middle values: " + srt[n / 2 - 1] + " and " + srt[n / 2] + "; their average is " + decStr(med) + "."] };
    }
    if (k === "s_range") { n = r.int(5, 8); for (i = 0; i < n; i++) data.push(r.int(0, 30)); var mx = Math.max.apply(null, data), mn = Math.min.apply(null, data); return { kind: k, std: "6.SP.A.3", params: { data: data }, prompt: "Find the range of these " + ctx[1] + ": " + data.join(", ") + ".", answer: numAns(F(mx - mn)), steps: ["Range = greatest − least.", mx + " − " + mn + " = " + (mx - mn) + "."] }; }
    // s_missing
    n = r.int(4, 6); var mean2 = r.int(3, 12); for (i = 0; i < n - 1; i++) data.push(Math.max(0, mean2 + r.int(-3, 3))); var need = mean2 * n - data.reduce(function (s, v) { return s + v; }, 0);
    if (need < 0) { data = data.map(function () { return mean2; }); need = mean2; }
    return { kind: "s_missing", std: "6.SP.B.5c", params: { data: data, mean: mean2, n: n }, prompt: "After " + n + " games a team's mean is " + mean2 + " " + ctx[1] + ". The first " + (n - 1) + " games: " + data.join(", ") + ". How many in the last game?", answer: numAns(F(need), "auto", { unit: ctx[1] }), steps: ["Total needed = mean × games = " + mean2 + " × " + n + " = " + (mean2 * n) + ".", "So far: " + data.join(" + ") + " = " + data.reduce(function (s, v) { return s + v; }, 0) + ".", (mean2 * n) + " − " + data.reduce(function (s, v) { return s + v; }, 0) + " = " + need + "."] };
  };

  function generate(topic, seed, level) {
    var r = rng((seed * 2654435761) ^ (level * 97) ^ topic.length * 7919);
    var p = G[topic](r, level);
    p.topic = topic; p.seed = seed; p.level = level; p.id = topic + "-" + level + "-" + seed;
    return p;
  }

  // ---------- answer checking ----------
  function parseNum(s) {
    if (s === null || s === undefined) return null;
    s = String(s).trim().toLowerCase().replace(/[,$%°]/g, "").replace(/−/g, "-").replace(/[a-z²³ ]+$/g, "").trim();
    var m;
    if ((m = s.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) { var d = +m[4]; if (!d) return null; var v = F((+m[2]) * d + (+m[3]), d); return m[1] ? F(-v.n, v.d) : v; }
    if ((m = s.match(/^(-?\d+)\s*\/\s*(\d+)$/))) { if (!+m[2]) return null; return F(+m[1], +m[2]); }
    if ((m = s.match(/^-?(\d+\.?\d*|\.\d+)$/))) return decF(s[0] === "." ? "0" + s : s.replace(/^-\./, "-0.").replace(/\.$/, ""));
    return null;
  }
  function check(p, input) {
    var a = p.answer;
    if (a.type === "choice") return Number(input) === a.index;
    var v = parseNum(input); if (!v) return false;
    return v.n * a.d === a.n * v.d;
  }

  // ---------- sessions (fully determined by a session seed) ----------
  function planSession(mode, topic, sseed, levels) {
    var r = rng(sseed ^ 0x5eed), ids = TOPICS.map(function (t) { return t.id; }), out = [], n = mode === "blitz" ? 80 : mode === "boss" ? 10 : 10;
    var order = []; while (order.length < n) order = order.concat(r.shuffle(ids));
    for (var i = 0; i < n; i++) {
      var t = topic && topic !== "mixed" ? topic : order[i];
      var L = mode === "boss" ? 3 : Math.max(1, Math.min(3, (levels && levels[t]) || 1));
      out.push(generate(t, r.int(1, 2000000000), L));
    }
    return out;
  }

  var API = { TOPICS: TOPICS, generate: generate, check: check, parseNum: parseNum, planSession: planSession, F: F, decStr: decStr, fracStr: fracStr, mixedStr: mixedStr };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.MathGen = API;
})(typeof window !== "undefined" ? window : this);
