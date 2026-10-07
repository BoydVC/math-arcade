// Headless play-through: Chrome plays the real dist/ page. Answers come from the independent Python solver
// (never from the page's own answer key). Prints a JSON report; exits non-zero on any failure.
import { launch, sleep } from "./cdp.mjs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
const R = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL0 = process.argv[2] || pathToFileURL(join(R, "dist/index.html")).href;
const py = spawn("python3", [join(R, "tests/solve_serve.py")], { stdio: ["pipe", "pipe", "inherit"] });
const rl = createInterface({ input: py.stdout }); const q = [];
rl.on("line", (l) => q.shift()(JSON.parse(l)));
const solve = (p) => new Promise((r) => { q.push(r); py.stdin.write(JSON.stringify(p) + "\n"); });
const checks = []; const ok = (name, cond, info = "") => { checks.push({ name, pass: !!cond, info: String(info) }); };
const b = await launch(9461 + Math.floor(Math.random() * 200));
const sel = (s) => JSON.stringify(s);
const click = (s) => b.ev(`(()=>{const e=document.querySelector(${sel(s)}); if(!e) throw new Error("no "+${sel(s)}); e.click(); return true})()`);
const waitFor = async (expr, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.ev(expr)) return true; await sleep(80); } return false; };

// answer the current problem; wantRight=false -> deliberately wrong
async function answer(wantRight) {
  const p = await b.ev("window.__arcade.current()"); const s = await solve(p);
  if (s.verify) ok("live problem verifies " + p.id, false, s.verify);
  const card = await b.ev(`(()=>{const c=document.querySelector('.qcard');return {id:c.dataset.id,type:c.dataset.type,prompt:document.querySelector('#prompt').textContent}})()`);
  if (card.id !== p.id || card.prompt !== p.prompt) ok("card matches problem", false, card.id + " vs " + p.id);
  if (p.answer.type === "choice") {
    const i = wantRight ? s.choice : (s.choice + 1) % p.answer.choices.length;
    await click(`.choice[data-i="${i}"]`);
  } else {
    await b.ev(`(()=>{const a=document.querySelector('#ans');a.value=${sel(wantRight ? s.text : s.wrong)};document.querySelector('#check').click()})()`);
  }
  await waitFor("!!document.querySelector('#fb.good,#fb.bad')", 3000);
  const fb = await b.ev("(document.querySelector('#fb')||{}).className||''");
  return { p, fb, expected: wantRight ? "good" : "bad" };
}
let mism = 0, played = 0;
async function playSession(startSel, pattern) {
  await click(startSel); await waitFor("!!document.querySelector('.qcard')");
  let i = 0;
  while (await b.ev("window.__arcade.view()") === "play") {
    const r = await answer(pattern(i)); played++; if (r.fb !== r.expected) { mism++; ok("feedback " + r.p.id, false, r.fb + " expected " + r.expected); }
    i++;
    if (await b.ev("!!(document.querySelector('#next')&&document.querySelector('#next').style.display!=='none')")) await click("#next");
    await waitFor("window.__arcade.view()!=='play' || (window.__arcade.session() && !window.__arcade.session().answered)", 4000);
    if (i > 120) break;
  }
  return b.ev(`(()=>{const r=document.querySelector('.res');return r?{correct:+r.dataset.correct,total:+r.dataset.total,xp:+r.dataset.xp,won:+r.dataset.won,unlock:(document.querySelector('#unlocked')||{}).textContent||''}:null})()`);
}
try {
  await b.viewport(1280, 800);
  await b.goto(URL0 + "?sseed=2026", 1200);
  await b.ev("localStorage.clear()"); await b.goto(URL0 + "?sseed=2026", 1200);
  ok("home renders 8 topics", (await b.ev("document.querySelectorAll('.topic').length")) === 8);
  ok("offline: no external requests in DOM", (await b.ev("[...document.querySelectorAll('script[src],link[href],img[src]')].length")) === 0);

  // 1) Quick 10 mixed: right on even, wrong on index 3 and 7
  const q1 = await playSession('[data-start="quick"]', (i) => i !== 3 && i !== 7);
  ok("quick10 results 8/10", q1 && q1.correct === 8 && q1.total === 10, JSON.stringify(q1));
  const xpA = await b.ev("window.__arcade.state().xp");
  ok("quick10 XP awarded (8 right at Lv1 = 80 + 2 for misses + 20 bonus)", q1 && q1.xp === 102 && xpA === 102, q1 && q1.xp);

  // 2) Hint: open a topic sheet, start quick on fractions, use a hint, answer right -> half XP
  await click('[data-go="home"]'); await click('.topic[data-topic="fractions"]'); await click('[data-start="quick"][data-t="fractions"]');
  await waitFor("!!document.querySelector('.qcard')");
  const steps = await b.ev("window.__arcade.current().steps.length");
  await click("#hint"); const hintTxt = await b.ev("document.querySelector('#hintbox').textContent");
  ok("hint shows worked step", hintTxt.includes("Hint 1") && steps >= 2, hintTxt.slice(0, 80));
  const xpB = await b.ev("window.__arcade.state().xp"); const r0 = await answer(true);
  const xpC = await b.ev("window.__arcade.state().xp");
  ok("hinted correct answer earns half XP", r0.fb === "good" && xpC - xpB === Math.ceil(10 * r0.p.level / 2), xpC - xpB);
  ok("all fraction-session problems are fractions topic", r0.p.topic === "fractions");
  await click("[data-quit]"); await waitFor("!!document.querySelector('.res')");

  // 3) Boss battle: all correct -> win, +100, unlocks Night Game theme
  await click('[data-go="home"]'); await click('[data-go="bosses"]');
  const boss = await playSession('[data-start="boss"][data-t="integers"]', () => true);
  ok("boss won 8/8", boss && boss.won === 1 && boss.correct === 8, JSON.stringify(boss));
  ok("boss win unlocks Night Game theme", boss && /Night Game/.test(boss.unlock), boss && boss.unlock);
  ok("boss win recorded", (await b.ev("window.__arcade.state().topics.integers.bossWins")) === 1);
  // boss problems are level 3
  const lv = await b.ev("window.__arcade.state().sessions.at(-1).results.every(r=>r.level===3 && r.topic==='integers')");
  ok("boss problems are level 3 of its topic", lv);

  // 3b) Boss loss: 3 wrong -> lose
  await click('[data-go="home"]'); await click('[data-go="bosses"]');
  const boss2 = await playSession('[data-start="boss"][data-t="stats"]', () => false);
  ok("boss lost after 3 misses", boss2 && boss2.won === 0 && boss2.total === 3, JSON.stringify(boss2));

  // 4) Theme switch persists
  await click('[data-go="home"]'); await click('.nav [data-go="themes"]'); await click('[data-theme="night"]');
  ok("theme applied", (await b.ev("document.body.className")) === "theme-night");
  ok("locked themes disabled", (await b.ev("document.querySelector('[data-theme=space]').disabled")) === true);

  // 5) Blitz: answer fast until time runs out (shorten clock via the real path: just play; 90s budget)
  await click('[data-go="home"]');
  const tBl = Date.now();
  await click('[data-start="blitz"]'); await waitFor("!!document.querySelector('.qcard')");
  let bl = 0;
  while (await b.ev("window.__arcade.view()") === "play" && bl < 200) {
    const pid = await b.ev("window.__arcade.current().id");
    const r = await answer(bl % 5 !== 4); played++; bl++;
    if (r.fb !== r.expected) { mism++; ok("blitz feedback " + r.p.id, false, r.fb); }
    await waitFor(`window.__arcade.view()!=='play' || window.__arcade.current().id!==${sel(pid)}`, 3000);
  }
  const blr = await b.ev(`(()=>{const r=document.querySelector('.res');return r?{correct:+r.dataset.correct,total:+r.dataset.total,xp:+r.dataset.xp}:null})()`);
  const secs = (Date.now() - tBl) / 1000;
  ok("blitz ends on the 90s clock", blr && secs >= 88 && secs < 110, secs.toFixed(1) + "s " + JSON.stringify(blr));
  ok("blitz scored", blr && blr.total >= 10 && blr.correct === blr.total - Math.floor(blr.total / 5), JSON.stringify(blr));

  // 6) Persistence across reload
  const before = await b.ev("JSON.stringify(window.__arcade.state())");
  await b.goto(URL0, 1200);
  const after = await b.ev("JSON.stringify(window.__arcade.state())");
  ok("progress persists across reload", before === after && JSON.parse(after).sessions.length === 5, JSON.parse(after).sessions.length);
  ok("theme persists", (await b.ev("document.body.className")) === "theme-night");

  // 7) Export JSON
  const ex = await b.ev("window.__arcade.exportData()");
  const sumXp = ex._state.sessions.reduce((a, s) => a + s.xp, 0);
  ok("export has app/summary/_state", ex.app === "Vic's Math Arcade" && ex.summary && ex._state && ex.summary.topics.length === 8);
  ok("export XP equals sum of session XP", ex.summary.xp === sumXp, ex.summary.xp + " vs " + sumXp);
  const exportedResults = ex._state.sessions.flatMap((s) => s.results);
  ok("every exported result carries id, std, prompt, answer", exportedResults.every((r) => r.id && r.std && r.prompt && r.answer !== undefined), exportedResults.length);
  await click('[data-go="progress"]'); ok("progress page renders table", (await b.ev("document.querySelectorAll('table tr').length")) >= 9);
  await click('[data-go="standards"]'); ok("standards page cites CCSS URL", await b.ev("!!document.querySelector('a[href=\"https://www.thecorestandards.org/Math/Content/6/\"]')"));

  ok("no feedback mismatches", mism === 0, `${mism}/${played}`);
  ok("no JS errors", b.errors.length === 0, b.errors.join(" | "));
} catch (e) { ok("play script ran", false, e.stack); }
await b.close(); py.stdin.end();
const fails = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ played, checks, fails: fails.length }, null, 1));
process.exit(fails.length ? 1 : 0);
