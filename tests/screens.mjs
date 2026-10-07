// Screenshots. Demo progress comes from real headless play (answers from the independent solver), never hand-set numbers.
import { launch, sleep } from "./cdp.mjs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
const R = join(dirname(fileURLToPath(import.meta.url)), ".."), OUT = join(R, "screenshots");
const URL0 = process.argv[2] || pathToFileURL(join(R, "dist/index.html")).href;
const py = spawn("python3", [join(R, "tests/solve_serve.py")], { stdio: ["pipe", "pipe", "inherit"] });
const rl = createInterface({ input: py.stdout }); const q = []; rl.on("line", (l) => q.shift()(JSON.parse(l)));
const solve = (p) => new Promise((r) => { q.push(r); py.stdin.write(JSON.stringify(p) + "\n"); });
const b = await launch(9700 + Math.floor(Math.random() * 200)); const sel = JSON.stringify;
const click = (s) => b.ev(`document.querySelector(${sel(s)}).click()`);
async function answer(right) { const p = await b.ev("window.__arcade.current()"), s = await solve(p);
  if (p.answer.type === "choice") await click(`.choice[data-i="${right ? s.choice : (s.choice + 1) % p.answer.choices.length}"]`);
  else await b.ev(`(()=>{document.querySelector('#ans').value=${sel(right ? s.text : s.wrong)};document.querySelector('#check').click()})()`); await sleep(120); }
async function play(startSel, pat) { await click(startSel); await sleep(300); let i = 0;
  while (await b.ev("window.__arcade.view()") === "play" && i < 40) { await answer(pat(i++)); if (await b.ev("document.querySelector('#next').style.display!=='none'")) await click("#next"); await sleep(150); } }
const shots = [];
const snap = async (name, full = false) => { await sleep(350); await b.ev("window.__arcade.calm()"); await sleep(100); await b.shot(join(OUT, name), full); shots.push(name); };
try {
  await b.viewport(1280, 800); await b.goto(URL0 + "?sseed=606", 1000); await b.ev("localStorage.clear()"); await b.goto(URL0 + "?sseed=606", 1000);
  // build genuine demo progress: 3 quick-10s, 2 boss wins, topic quicks
  await play('[data-start="quick"]', (i) => i !== 4);
  await click('[data-go="home"]'); await play('[data-start="quick"]', (i) => i % 4 !== 2);
  for (const t of ["ratios", "geometry"]) { await click('[data-go="home"]'); await click('[data-go="bosses"]'); await play(`[data-start="boss"][data-t="${t}"]`, (i) => i !== 2); }
  for (const t of ["fractions", "decimals", "stats"]) { await click('[data-go="home"]'); await click(`.topic[data-topic="${t}"]`); await play(`[data-start="quick"][data-t="${t}"]`, (i) => i % 3 !== 1); }
  await click('[data-go="home"]'); await click('.nav [data-go="themes"]'); await click('[data-theme="hornets"]'); await click('[data-go="home"]');
  const views = [["desktop", 1280, 800, false, 1], ["tablet", 820, 1180, true, 2], ["phone", 390, 844, true, 3]];
  for (const [dev, w, h, mob, sc] of views) {
    await b.viewport(w, h, mob, sc); await click('[data-go="home"]');
    await snap(`${dev}-01-home.png`);
    await click('.topic[data-topic="rates"]'); await snap(`${dev}-02-topic-sheet.png`);
    await click('[data-start="quick"][data-t="rates"]'); await sleep(200);
    // advance to a sports word problem if one is near
    for (let k = 0; k < 6; k++) { const pr = await b.ev("window.__arcade.current().prompt"); if (/game|goal|team|batting|field|Comets|Falcons|Rockets|Sharks|Thunder|Owls|Lightning|Pioneers/.test(pr)) break; await answer(true); await click("#next"); await sleep(150); }
    await click("#hint"); await sleep(100); await click("#hint"); await snap(`${dev}-03-play-hint.png`);
    await answer(true); await snap(`${dev}-04-correct.png`);
    await click("#next"); await sleep(150); await answer(false); await snap(`${dev}-05-worked-steps.png`, dev !== "desktop");
    await click("[data-quit]"); await sleep(300);
    await click('[data-go="home"]'); await click('[data-go="bosses"]'); await click('[data-start="boss"][data-t="equations"]'); await sleep(200);
    await answer(true); await click("#next"); await sleep(150); await answer(true); await click("#next"); await sleep(150); await snap(`${dev}-06-boss.png`);
    for (let k = 2; k < 12 && await b.ev("window.__arcade.view()") === "play"; k++) { await answer(k !== 3); await click("#next"); await sleep(150); }
    await sleep(1200); await snap(`${dev}-07-results.png`, dev !== "desktop");
    await click('[data-go="home"]'); await click('.nav [data-go="themes"]'); await snap(`${dev}-08-stadiums.png`, dev !== "desktop");
    await click('.nav [data-go="progress"]'); await snap(`${dev}-09-progress.png`, true);
    await click('.nav [data-go="standards"]'); await snap(`${dev}-10-standards.png`, true);
    if (dev === "desktop") { await click('[data-go="home"]'); await snap("desktop-01-home-full.png", true); }
  }
  // blitz HUD shot (desktop)
  await b.viewport(1280, 800); await click('[data-go="home"]'); await click('[data-start="blitz"]'); await sleep(300);
  for (let k = 0; k < 4; k++) { await answer(true); await sleep(800); } await snap("desktop-11-blitz.png"); await click("[data-quit]");
} catch (e) { console.error(e.stack); process.exitCode = 1; }
console.log(JSON.stringify({ shots, errors: b.errors }));
await b.close(); py.stdin.end();
