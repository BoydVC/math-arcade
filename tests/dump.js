// Dump N problems per topic (levels 1-3, seeds spread) plus checker results, as JSON for the Python solver.
const M = require("../web/gen.js");
const N = +(process.argv[2] || 1000), base = +(process.argv[3] || 12345);
const out = [];
for (const t of M.TOPICS) for (let i = 0; i < N; i++) {
  const L = 1 + (i % 3), seed = base + i * 7919 + t.id.length;
  const p = M.generate(t.id, seed, L), a = p.answer;
  // checker sanity: canonical text accepted; equivalent forms accepted; a wrong answer rejected
  const ok = a.type === "choice" ? M.check(p, a.index) && !M.check(p, (a.index + 1) % a.choices.length)
    : M.check(p, a.text) && M.check(p, a.n + "/" + a.d) && (a.d !== 1 || M.check(p, String(a.n))) && !M.check(p, (a.n + a.d) + "/" + a.d) && !M.check(p, "");
  p.checker_ok = ok; out.push(p);
}
process.stdout.write(JSON.stringify(out));
