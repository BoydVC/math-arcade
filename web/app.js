/* Vic's Math Arcade: game shell. Progress lives in this browser (localStorage) and can be exported as JSON. Nothing is sent anywhere. */
(function () {
  "use strict";
  var M = window.MathGen, KEY = "vic-math-arcade-v1", $ = function (s, r) { return (r || document).querySelector(s); };
  var TOP = {}; M.TOPICS.forEach(function (t) { TOP[t.id] = t; });
  var QS = new URLSearchParams(location.search);
  var THEMES = [
    { id: "backyard", name: "Backyard Field", icon: "🏡", need: "Starter field", ok: function () { return true; }, sw: "linear-gradient(180deg,#0f3d22,#1f7a40)" },
    { id: "sandlot", name: "Sandlot Diamond", icon: "⚾", need: "Earn 200 XP", ok: function (S) { return S.xp >= 200; }, sw: "linear-gradient(180deg,#6b3f1d,#c98b4b)" },
    { id: "hornets", name: "Hornets' Nest Pitch", icon: "🐝", need: "Earn 500 XP", ok: function (S) { return S.xp >= 500; }, sw: "linear-gradient(180deg,#0a3d1d,#13883e)" },
    { id: "night", name: "Night Game Lights", icon: "🌙", need: "Beat any boss", ok: function (S) { return bossCount(S) >= 1; }, sw: "radial-gradient(circle at 20% 15%,#fffbd1,transparent 30%),linear-gradient(180deg,#020617,#0b3a2a)" },
    { id: "dome", name: "Rainy Day Dome", icon: "☔", need: "Finish 3 Timed Blitzes", ok: function (S) { return S.sessions.filter(function (s) { return s.mode === "blitz"; }).length >= 3; }, sw: "linear-gradient(180deg,#1e293b,#475569)" },
    { id: "retro", name: "Retro Arcade", icon: "🕹️", need: "Earn 1,500 XP", ok: function (S) { return S.xp >= 1500; }, sw: "linear-gradient(180deg,#1a1033,#ff2e88)" },
    { id: "champs", name: "Championship Stadium", icon: "🏆", need: "Beat 4 bosses", ok: function (S) { return bossCount(S) >= 4; }, sw: "linear-gradient(180deg,#3b0764,#b45309)" },
    { id: "space", name: "Space Station Arena", icon: "🚀", need: "Beat all 8 bosses", ok: function (S) { return bossCount(S) >= 8; }, sw: "radial-gradient(2px 2px at 30% 30%,#fff,transparent),linear-gradient(180deg,#000,#1e1b4b)" }
  ];
  var TITLES = ["Rookie", "Bench Warmer", "Starter", "Playmaker", "All-Star", "Captain", "MVP", "Hall of Famer", "Legend", "Math GOAT"];
  var CHEERS = ["GOAL! ⚽", "Home run! ⚾", "Nothing but net!", "Clutch!", "Ice cold! 🧊", "Upper 90! 🎯", "Walk-off! 🎉"];
  var COMBO = ["ON FIRE! 🔥", "Hat trick! 🎩", "Unstoppable!", "Grand slam! 💥"];
  var SOFT = ["Close one, shake it off.", "Foul ball, next pitch!", "Off the post, check the steps.", "Strike one. You've got this."];
  var BLITZ_SECONDS = 90, BOSS_HP = 8, BOSS_LIVES = 3;
  var S, sess = null, view = "home", timerId = null, topicSheet = null;

  function fresh() { var t = {}; M.TOPICS.forEach(function (x) { t[x.id] = { seen: 0, correct: 0, bossWins: 0, bestBlitz: 0, hints: 0 }; });
    return { v: 1, created: new Date().toISOString(), xp: 0, theme: "backyard", topics: t, sessions: [], sound: false, nsess: 0 }; }
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 1) { var f = fresh(); for (var k in f.topics) if (!j.topics[k]) j.topics[k] = f.topics[k]; return j; } } catch (e) {} return fresh(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function bossCount(st) { return M.TOPICS.filter(function (t) { return st.topics[t.id].bossWins > 0; }).length; }
  function levelOf(xp) { var L = 1; while (xp >= 50 * (L + 1) * L) L++; return { level: L, base: 50 * L * (L - 1), next: 50 * (L + 1) * L, title: TITLES[Math.min(L - 1, TITLES.length - 1)] }; }
  function topicLevel(id) { var t = S.topics[id]; return t.correct >= 30 ? 3 : t.correct >= 12 ? 2 : 1; }
  function stars(id) { var L = topicLevel(id); return "★★★".slice(0, L) + "☆☆☆".slice(0, 3 - L); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function unlockedThemes() { return THEMES.filter(function (t) { return t.ok(S); }).map(function (t) { return t.id; }); }
  function applyTheme() { document.body.className = "theme-" + S.theme; }

  /* ---------- sessions ---------- */
  function start(mode, topic) {
    var levels = {}; M.TOPICS.forEach(function (t) { levels[t.id] = topicLevel(t.id); });
    var base = QS.get("sseed") ? +QS.get("sseed") + S.nsess : (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    var plan = M.planSession(mode, topic || "mixed", base, levels);
    sess = { mode: mode, topic: topic || "mixed", sseed: base, plan: plan, i: 0, results: [], combo: 0, best: 0, xp: 0, hp: BOSS_HP, lives: BOSS_LIVES,
             t0: Date.now(), lvlBefore: levelOf(S.xp).level, themesBefore: unlockedThemes(), hintsUsed: 0, answered: false, hintStep: 0 };
    S.nsess++; view = "play"; topicSheet = null; render();
    if (mode === "blitz") { sess.deadline = Date.now() + BLITZ_SECONDS * 1000; tickTimer(); }
  }
  function cur() { return sess && sess.plan[sess.i]; }
  function tickTimer() {
    clearInterval(timerId);
    timerId = setInterval(function () {
      if (!sess || sess.mode !== "blitz") { clearInterval(timerId); return; }
      var left = Math.max(0, Math.ceil((sess.deadline - Date.now()) / 1000)), el = $("#timer");
      if (el) { el.textContent = "⏱ " + left + "s"; el.classList.toggle("low", left <= 10); }
      if (left <= 0) { clearInterval(timerId); sess.timeUp = true; finish(); }
    }, 250);
  }
  function submit(given) {
    var p = cur(); if (!p || sess.answered) return;
    var ok = M.check(p, given); sess.answered = true;
    var base = 10 * p.level, gain = ok ? (sess.hintStep ? Math.ceil(base / 2) : base) : 1;
    if (ok) { sess.combo++; sess.best = Math.max(sess.best, sess.combo); if (sess.mode === "blitz") gain += Math.min(10, 2 * (sess.combo - 1)); }
    else sess.combo = 0;
    if (sess.mode === "boss") { if (ok) sess.hp--; else sess.lives--; }
    sess.xp += gain; S.xp += gain;
    var ts = S.topics[p.topic]; ts.seen++; if (ok) ts.correct++; if (sess.hintStep) ts.hints++;
    sess.results.push({ id: p.id, topic: p.topic, kind: p.kind, std: p.std, level: p.level, prompt: p.prompt, given: String(given), answer: p.answer.text, correct: ok, hints: sess.hintStep, xp: gain });
    save(); chime(ok);
    showFeedback(ok, gain, p, given);
    var over = sess.mode === "boss" ? (sess.hp <= 0 || sess.lives <= 0) : sess.mode === "quick" ? sess.i >= sess.plan.length - 1 : false; // blitz ends only on the clock
    sess.over = over;
    if (sess.mode === "blitz") setTimeout(function () { if (sess && sess.mode === "blitz" && !sess.timeUp) next(); }, ok ? 650 : 1600);
  }
  function next() { if (!sess) return; if (sess.over) return finish();
    if (sess.mode === "blitz" && sess.i + 1 >= sess.plan.length) { var lv = {}; M.TOPICS.forEach(function (t) { lv[t.id] = topicLevel(t.id); }); sess.plan = sess.plan.concat(M.planSession("blitz", sess.topic, (sess.sseed + 7919 * sess.plan.length) >>> 0, lv)); }
    sess.i++; sess.answered = false; sess.hintStep = 0; render(); }
  function finish() {
    if (!sess || sess.done) return; sess.done = true; clearInterval(timerId);
    var correct = sess.results.filter(function (r) { return r.correct; }).length, total = sess.results.length, bonus = 0;
    if (sess.mode === "quick" && correct >= 7) bonus = 20 + (correct === 10 ? 20 : 0);
    if (sess.mode === "boss" && sess.hp <= 0) { bonus = 100; S.topics[sess.topic].bossWins++; sess.won = true; }
    if (sess.mode === "blitz" && sess.topic !== "mixed") S.topics[sess.topic].bestBlitz = Math.max(S.topics[sess.topic].bestBlitz, correct);
    sess.bonus = bonus; sess.xp += bonus; S.xp += bonus;
    S.sessions.push({ at: new Date().toISOString(), mode: sess.mode, topic: sess.topic, sseed: sess.sseed, correct: correct, total: total, xp: sess.xp, bestCombo: sess.best, won: !!sess.won, secs: Math.round((Date.now() - sess.t0) / 1000), results: sess.results });
    if (S.sessions.length > 300) S.sessions = S.sessions.slice(-300);
    sess.newThemes = unlockedThemes().filter(function (t) { return sess.themesBefore.indexOf(t) < 0; });
    save(); view = "results"; render();
    if (correct / Math.max(1, total) >= .7 || sess.won) burst(innerWidth / 2, innerHeight / 3, 160);
  }

  /* ---------- views ---------- */
  function topbar() { var lv = levelOf(S.xp); return '<div class="top"><div class="logo" data-go="home">Vic\'s <b>Math</b> Arcade</div><div class="sp"></div><span class="pill">⚡ <span id="xpv">' + S.xp + '</span> XP</span><span class="pill lvl">Lv ' + lv.level + "</span></div>"; }
  function nav() { return '<div class="nav"><button data-go="home">🏟️ Home</button><button data-go="themes">🎨 Stadiums</button><button data-go="progress">📈 Progress</button><button data-go="standards">📚 Standards</button></div>'; }
  function vHome() {
    var lv = levelOf(S.xp), frac = (S.xp - lv.base) / (lv.next - lv.base), C = 2 * Math.PI * 42, th = THEMES.filter(function (t) { return t.id === S.theme; })[0];
    var h = topbar() + nav() + '<div class="card hero"><div class="ring"><svg width="96" height="96"><circle cx="48" cy="48" r="42" stroke="#e7ece8" stroke-width="9" fill="none"/><circle cx="48" cy="48" r="42" stroke="url(#g)" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - frac)) + '"/><defs><linearGradient id="g"><stop offset="0" stop-color="#ffcc29"/><stop offset="1" stop-color="#ff5d5d"/></linearGradient></defs></svg><div class="in"><div><div class="n">' + lv.level + '</div><div class="t">level</div></div></div></div>' +
      '<div><h2>Hey Vic! 👋 ' + esc(lv.title) + '</h2><div class="sub">' + (lv.next - S.xp) + " XP to Level " + (lv.level + 1) + " · Stadium: " + th.icon + " " + esc(th.name) + " · 🏆 " + bossCount(S) + "/8 bosses beaten</div>" +
      '<div class="xpbar"><i style="width:' + Math.round(frac * 100) + '%"></i></div></div></div>' +
      '<div class="modes"><button class="mode quick" data-start="quick"><div class="ic">⚡</div><div class="nm">Quick 10</div><div class="ds">10 mixed problems from all 8 topics. Bonus XP for 7+.</div></button>' +
      '<button class="mode blitz" data-start="blitz"><div class="ic">⏱️</div><div class="nm">Timed Blitz</div><div class="ds">' + BLITZ_SECONDS + ' seconds. Streaks stack combo XP.</div></button>' +
      '<button class="mode bossm" data-go="bosses"><div class="ic">👾</div><div class="nm">Boss Battles</div><div class="ds">One boss per topic. Knock out ' + BOSS_HP + ' HP before you lose ' + BOSS_LIVES + ' lives.</div></button></div>' +
      '<div class="card"><h3>Pick a topic</h3><div class="sub" style="margin-bottom:10px">Stars rise as you get problems right, and harder problems unlock.</div><div class="topics">' +
      M.TOPICS.map(function (t) { var s = S.topics[t.id]; return '<button class="topic" data-topic="' + t.id + '">' + (s.bossWins ? '<span class="won" title="Boss beaten">🏆</span>' : "") + '<div class="ic">' + t.icon + '</div><div class="nm">' + esc(t.name) + '</div><div class="stars">' + stars(t.id) + '</div><div class="std">' + esc(t.cc) + "</div><div class=\"std\">" + (s.seen ? Math.round(100 * s.correct / s.seen) + "% · " + s.seen + " tried" : "new!") + "</div></button>"; }).join("") + "</div></div>";
    if (topicSheet) { var t = TOP[topicSheet], st = S.topics[topicSheet];
      h += '<dialog id="sheet" open style="position:fixed;top:20%;z-index:40"><h2>' + t.icon + " " + esc(t.name) + '</h2><div class="sub">' + esc(t.cc) + " · Maryland " + esc(t.md) + " · Level " + topicLevel(topicSheet) + " " + stars(topicSheet) + '</div><div class="row" style="margin-top:12px">' +
        '<button class="btn primary" data-start="quick" data-t="' + t.id + '">⚡ Quick 10</button><button class="btn" data-start="blitz" data-t="' + t.id + '">⏱️ Blitz</button><button class="btn" data-start="boss" data-t="' + t.id + '">👾 Boss: ' + esc(t.boss) + (st.bossWins ? " 🏆" : "") + '</button><button class="btn ghost" data-close>Close</button></div></dialog>'; }
    return h;
  }
  function vBosses() {
    return topbar() + nav() + '<div class="card"><h2>👾 Boss Battles</h2><div class="sub">Every boss fights with level-3 problems. Each right answer deals 1 damage (' + BOSS_HP + ' HP), and each miss costs a life (you have ' + BOSS_LIVES + '). Beat bosses to unlock stadiums.</div></div><div class="topics">' +
      M.TOPICS.map(function (t) { var s = S.topics[t.id]; return '<button class="topic" data-start="boss" data-t="' + t.id + '">' + (s.bossWins ? '<span class="won">🏆</span>' : "") + '<div class="ic">' + t.icon + '</div><div class="nm">' + esc(t.boss) + '</div><div class="std">' + esc(t.name) + "</div><div class=\"std\">" + (s.bossWins ? "Beaten ×" + s.bossWins : "Undefeated…") + "</div></button>"; }).join("") + "</div>";
  }
  function vPlay() {
    var p = cur(), t = TOP[p.topic], h = topbar(), hud = '<div class="hud"><span class="pill">' + (sess.mode === "quick" ? "⚡ Quick 10" : sess.mode === "blitz" ? "⏱️ Blitz" : "👾 Boss") + (sess.topic !== "mixed" ? " · " + esc(TOP[sess.topic].name) : "") + "</span>";
    if (sess.mode === "quick") hud += '<div class="dots">' + sess.plan.map(function (_, i) { var r = sess.results[i]; return "<i class=\"" + (r ? (r.correct ? "ok" : "no") : i === sess.i ? "cur" : "") + '"></i>'; }).join("") + "</div>";
    if (sess.mode === "blitz") hud += '<span id="timer" class="timer">⏱ ' + Math.max(0, Math.ceil((sess.deadline - Date.now()) / 1000)) + "s</span><span class=\"pill\">✅ " + sess.results.filter(function (r) { return r.correct; }).length + "</span>";
    hud += (sess.combo >= 2 ? '<span class="pill">🔥 ×' + sess.combo + "</span>" : "") + '<span class="sp" style="flex:1"></span><button class="btn small ghost" style="color:#fff" data-quit>Quit</button></div>';
    h += hud;
    if (sess.mode === "boss") h += '<div class="boss"><div class="face" id="bossface">👾</div><div class="hp"><b>' + esc(t.boss) + '</b><div class="bar"><i style="width:' + (100 * sess.hp / BOSS_HP) + '%"></i></div><small>' + sess.hp + "/" + BOSS_HP + ' HP</small></div><div class="hearts">' + "❤️".repeat(Math.max(0, sess.lives)) + "🖤".repeat(BOSS_LIVES - Math.max(0, sess.lives)) + "</div></div>";
    var input = p.answer.type === "choice"
      ? '<div class="choices">' + p.answer.choices.map(function (c, i) { return '<button class="choice" data-i="' + i + '">' + esc(c) + "</button>"; }).join("") + "</div>"
      : '<div class="ansrow"><input id="ans" inputmode="text" autocomplete="off" placeholder="Your answer" aria-label="answer"><button class="btn go" id="check">Check</button></div>' +
        '<div class="pad">' + ["7", "8", "9", "/", "⌫", "C", "4", "5", "6", ".", "-", "␣", "1", "2", "3", "0", "%", "✓"].map(function (k) { return '<button data-k="' + k + '">' + k + "</button>"; }).join("") + "</div>" +
        '<div class="note">Type a whole number, decimal, fraction like 3/4, or mixed number like 1 1/2. You can leave off units.</div>';
    h += '<div class="card qcard" data-id="' + p.id + '" data-topic="' + p.topic + '" data-seed="' + p.seed + '" data-level="' + p.level + '" data-type="' + p.answer.type + '" data-kind="' + p.kind + '">' +
      '<span class="chip">' + t.icon + " " + esc(t.name) + '</span><span class="chip">CCSS ' + esc(p.std) + '</span><span class="chip">Lv ' + p.level + "</span>" +
      '<div class="prompt" id="prompt">' + esc(p.prompt) + "</div>" + input +
      '<div class="row" style="margin-top:10px"><button class="btn small" id="hint">💡 Hint (½ XP)</button><span class="sp" style="flex:1"></span><button class="btn primary" id="next" style="display:none">Next ➜</button></div>' +
      '<div id="hintbox"></div><div id="fb"></div></div>';
    return h;
  }
  function stepsHtml(p, n) { return '<ol>' + p.steps.slice(0, n).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>"; }
  function showHint() {
    var p = cur(); if (!p || sess.answered) return; sess.hintStep = Math.min(p.steps.length - 1, sess.hintStep + 1); sess.hintsUsed++;
    if (sess.hintStep >= p.steps.length - 1) { var hb0 = $("#hint"); hb0.disabled = true; hb0.textContent = "💡 All hints shown"; }
    $("#hintbox").innerHTML = '<div class="hintbox"><b>💡 Hint ' + sess.hintStep + " of " + (p.steps.length - 1) + "</b>" + stepsHtml(p, sess.hintStep) + (sess.hintStep >= p.steps.length - 1 ? '<div class="note">That\'s every hint step. The last step (the answer) shows after you check.</div>' : "") + "</div>";
  }
  function showFeedback(ok, gain, p, given) {
    var fb = $("#fb"); if (!fb) return;
    fb.className = ok ? "good" : "bad";
    fb.innerHTML = ok ? '<div class="big">' + (sess.combo >= 3 ? pick(COMBO) : pick(CHEERS)) + " +" + gain + ' XP</div><div class="sub">Answer: <b>' + esc(p.answer.text) + "</b></div>"
                      : '<div class="big">' + pick(SOFT) + '</div><div>Answer: <b>' + esc(p.answer.text) + "</b></div>" + '<div class="hintbox"><b>Worked steps</b>' + stepsHtml(p, p.steps.length) + "</div>";
    document.querySelectorAll(".choice").forEach(function (b) { var i = +b.dataset.i; if (i === p.answer.index) b.classList.add("right"); else if (String(i) === String(given)) b.classList.add("wrong"); b.disabled = true; });
    var a = $("#ans"); if (a) a.disabled = true; var c = $("#check"); if (c) c.disabled = true; var hb = $("#hint"); if (hb) hb.disabled = true;
    if (sess.mode !== "blitz") { var nb = $("#next"); nb.style.display = ""; nb.textContent = sess.over ? "See results 🏁" : "Next ➜"; nb.focus(); }
    var r = fb.getBoundingClientRect(); if (ok) { burst(r.left + r.width / 2, r.top, 40); floatXp("+" + gain + " XP", r.left + r.width / 2, r.top); }
    if (sess.mode === "boss") { var bar = $(".boss .bar i"); if (bar) bar.style.width = (100 * Math.max(0, sess.hp) / BOSS_HP) + "%"; var bf = $("#bossface"); if (ok && bf) { bf.classList.remove("hit"); void bf.offsetWidth; bf.classList.add("hit"); }
      var hs = $(".boss .hearts"); if (hs) hs.textContent = "❤️".repeat(Math.max(0, sess.lives)) + "🖤".repeat(BOSS_LIVES - Math.max(0, sess.lives)); var sm = $(".boss small"); if (sm) sm.textContent = Math.max(0, sess.hp) + "/" + BOSS_HP + " HP"; }
    var xv = $("#xpv"); if (xv) xv.textContent = S.xp;
  }
  function vResults() {
    var correct = sess.results.filter(function (r) { return r.correct; }).length, total = sess.results.length, lv = levelOf(S.xp);
    var msg = sess.quit && !sess.won ? "Game paused early. Nice work on the ones you played!" : sess.mode === "boss" ? (sess.won ? "You knocked out " + esc(TOP[sess.topic].boss) + "! 🏆" : esc(TOP[sess.topic].boss) + " wins this round. Rematch?")
      : sess.mode === "blitz" ? correct + " right in " + BLITZ_SECONDS + " seconds (best streak " + sess.best + ")" : correct >= 9 ? "Unreal. MVP stuff." : correct >= 7 ? "Great game!" : correct >= 5 ? "Solid. Keep swinging." : "Every pro has off days. Run it back!";
    return topbar() + '<div class="card res" data-correct="' + correct + '" data-total="' + total + '" data-xp="' + sess.xp + '" data-won="' + (sess.won ? 1 : 0) + '"><div class="sub">' + (sess.mode === "quick" ? "⚡ Quick 10" : sess.mode === "blitz" ? "⏱️ Timed Blitz" : "👾 Boss Battle") + (sess.topic !== "mixed" ? " · " + esc(TOP[sess.topic].name) : " · Mixed") + "</div>" +
      '<div class="big">' + correct + "/" + total + '</div><div class="msg">' + msg + '</div><div class="row" style="justify-content:center;margin-top:10px"><span class="pill" style="background:#14231a">⚡ +' + sess.xp + " XP" + (sess.bonus ? " (incl. +" + sess.bonus + " bonus)" : "") + '</span><span class="pill" style="background:#14231a">🔥 best streak ' + sess.best + "</span></div>" +
      (lv.level > sess.lvlBefore ? '<div class="lvlup">🎉 Level up! You\'re Level ' + lv.level + ": " + esc(lv.title) + "</div>" : "") +
      (sess.newThemes.length ? '<div class="unlock" id="unlocked">🔓 New stadium unlocked: ' + sess.newThemes.map(function (id) { var t = THEMES.filter(function (x) { return x.id === id; })[0]; return t.icon + " " + esc(t.name); }).join(", ") + ' <button class="btn small" data-go="themes">Try it</button></div>' : "") +
      "<ul>" + sess.results.map(function (r) { return "<li>" + (r.correct ? "✅ " : "❌ ") + esc(r.prompt) + '<span class="a">' + (r.correct ? "" : "You: " + esc(r.given) + " · ") + "Answer: " + esc(r.answer) + " · " + esc(r.std) + (r.hints ? " · used hint" : "") + "</span></li>"; }).join("") + "</ul>" +
      '<div class="row" style="justify-content:center"><button class="btn primary" data-start="' + sess.mode + '" data-t="' + (sess.topic === "mixed" ? "" : sess.topic) + '">🔁 Play again</button><button class="btn" data-go="home">🏟️ Home</button></div></div>';
  }
  function vThemes() {
    var un = unlockedThemes();
    return topbar() + nav() + '<div class="card"><h2>🎨 Stadiums</h2><div class="sub">Unlock new stadiums with XP and boss wins, then tap one to play there.</div></div><div class="themes">' +
      THEMES.map(function (t) { var ok = un.indexOf(t.id) >= 0; return '<button class="th ' + (S.theme === t.id ? "on " : "") + (ok ? "" : "locked") + '" data-theme="' + t.id + '"' + (ok ? "" : " disabled") + '><div class="sw" style="background:' + t.sw + '"><span>' + (ok ? t.icon : "🔒") + '</span></div><div class="tx"><b>' + esc(t.name) + '</b><span class="sub">' + (ok ? (S.theme === t.id ? "Playing here now" : "Unlocked: tap to use") : "🔒 " + esc(t.need)) + "</span></div></button>"; }).join("") + "</div>";
  }
  function vProgress() {
    var rows = M.TOPICS.map(function (t) { var s = S.topics[t.id]; return "<tr><td>" + t.icon + " " + esc(t.name) + "</td><td>" + stars(t.id) + "</td><td>" + s.correct + "/" + s.seen + "</td><td>" + (s.seen ? Math.round(100 * s.correct / s.seen) + "%" : "–") + "</td><td>" + (s.bossWins ? "🏆 ×" + s.bossWins : "–") + "</td><td>" + s.hints + "</td></tr>"; }).join("");
    var recent = S.sessions.slice(-8).reverse().map(function (s) { return "<tr><td>" + new Date(s.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + "</td><td>" + s.mode + "</td><td>" + (s.topic === "mixed" ? "Mixed" : esc(TOP[s.topic].name)) + "</td><td>" + s.correct + "/" + s.total + "</td><td>+" + s.xp + "</td></tr>"; }).join("");
    return topbar() + nav() + '<div class="card"><h2>📈 Progress</h2><table><tr><th>Topic</th><th>Level</th><th>Right</th><th>Acc.</th><th>Boss</th><th>Hints</th></tr>' + rows + "</table></div>" +
      '<div class="card"><h3>Recent games</h3>' + (recent ? '<table><tr><th>When</th><th>Mode</th><th>Topic</th><th>Score</th><th>XP</th></tr>' + recent + "</table>" : '<div class="sub">No games yet. Go play!</div>') + "</div>" +
      '<div class="card"><h3>💾 Save file</h3><div class="row"><button class="btn primary" id="export">⬇️ Export progress (JSON)</button><button class="btn" id="import">⬆️ Import</button><button class="btn ghost small" id="reset">Reset</button></div><div class="note">Progress is saved only in this browser. Export makes a JSON file a parent or teacher can open, with every session and every problem (prompt, answer given, correct answer, standard).</div></div>';
  }
  function vStandards() {
    return topbar() + nav() + '<div class="card"><h2>📚 Standards</h2><div class="sub">Every topic maps to the <a href="https://www.thecorestandards.org/Math/Content/6/" target="_blank" rel="noopener">Common Core Grade 6 math standards</a>. Each problem shows its exact code. Maryland adopted revised MCCRS math standards in July 2025, starting in SY 2026–27. They reorganize the Grade 6 content under new domain names. The Maryland column gives the closest matching cluster (cluster level) from MSDE\'s <a href="https://marylandpublicschools.org/about/Documents/DCAA/Math/revised/Grade-6-MCCRS-Math-Crosswalk-A.pdf" target="_blank" rel="noopener">Grade 6 crosswalk</a> (<a href="https://marylandpublicschools.org/about/pages/dcaa/math/revised-standards.aspx" target="_blank" rel="noopener">MCCRS page</a>).</div></div>' +
      '<div class="card"><table><tr><th>Topic</th><th>Common Core</th><th>Maryland 2025 cluster</th></tr>' + M.TOPICS.map(function (t) { return "<tr><td>" + t.icon + " " + esc(t.name) + "</td><td>" + esc(t.cc) + "</td><td>" + esc(t.md) + "</td></tr>"; }).join("") + "</table></div>";
  }
  function render() {
    clearSheetKeys(); applyTheme();
    var html = view === "play" ? vPlay() : view === "results" ? vResults() : view === "themes" ? vThemes() : view === "progress" ? vProgress() : view === "standards" ? vStandards() : view === "bosses" ? vBosses() : vHome();
    $("#app").innerHTML = html; bind(); window.scrollTo(0, 0);
    var a = $("#ans"); if (a && matchMedia("(min-width:900px)").matches) a.focus();
  }
  function clearSheetKeys() {}
  function bind() {
    document.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { if (sess && view === "play") { clearInterval(timerId); sess = null; } view = b.dataset.go; topicSheet = null; render(); }; });
    document.querySelectorAll("[data-start]").forEach(function (b) { b.onclick = function () { start(b.dataset.start, b.dataset.t || (b.dataset.start === "boss" ? null : null)); }; });
    document.querySelectorAll("[data-topic]").forEach(function (b) { if (b.classList.contains("topic")) b.onclick = function () { topicSheet = b.dataset.topic; render(); }; });
    document.querySelectorAll("[data-close]").forEach(function (b) { b.onclick = function () { topicSheet = null; render(); }; });
    document.querySelectorAll("[data-theme]").forEach(function (b) { b.onclick = function () { if (b.disabled) return; S.theme = b.dataset.theme; save(); render(); toast("Now playing at " + b.querySelector("b").textContent + "!"); }; });
    document.querySelectorAll(".choice").forEach(function (b) { b.onclick = function () { submit(b.dataset.i); }; });
    var c = $("#check"); if (c) c.onclick = function () { var v = $("#ans").value; if (!v.trim()) { toast("Type an answer first 🙂"); return; } submit(v); };
    var a = $("#ans"); if (a) a.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); if (sess.answered) next(); else c.click(); } };
    document.querySelectorAll(".pad button").forEach(function (b) { b.onclick = function () { var k = b.dataset.k, inp = $("#ans"); if (inp.disabled) return; if (k === "⌫") inp.value = inp.value.slice(0, -1); else if (k === "C") inp.value = ""; else if (k === "✓") c.click(); else inp.value += k === "␣" ? " " : k; }; });
    var h = $("#hint"); if (h) h.onclick = showHint;
    var n = $("#next"); if (n) n.onclick = next;
    var q = $("[data-quit]"); if (q) q.onclick = function () { if (sess.results.length) { sess.quit = true; finish(); } else { clearInterval(timerId); sess = null; view = "home"; render(); } };
    var ex = $("#export"); if (ex) ex.onclick = exportFile;
    var im = $("#import"); if (im) im.onclick = importDialog;
    var rs = $("#reset"); if (rs) rs.onclick = function () { if (confirm("Erase all progress on this device?")) { S = fresh(); save(); render(); } };
    document.onkeydown = function (e) { if (view === "play" && sess && sess.answered && e.key === "Enter" && !$("#ans")) next(); if (view === "play" && cur() && cur().answer.type === "choice" && !sess.answered && /^[1-4]$/.test(e.key)) submit(String(+e.key - 1)); };
  }

  /* ---------- export / import ---------- */
  function exportData() {
    return { app: "Vic's Math Arcade", version: 1, exported_at: new Date().toISOString(), note: "Generated locally. Every problem can be rebuilt from its id (topic-level-seed).",
      summary: { xp: S.xp, level: levelOf(S.xp).level, bosses_beaten: bossCount(S), sessions: S.sessions.length,
        topics: M.TOPICS.map(function (t) { var s = S.topics[t.id]; return { topic: t.name, standards: t.cc, maryland: t.md, seen: s.seen, correct: s.correct, accuracy: s.seen ? +(s.correct / s.seen).toFixed(3) : null, boss_wins: s.bossWins, hints: s.hints }; }) },
      _state: S };
  }
  function exportFile() { var blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" }), u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = "vic-math-arcade-progress-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000); toast("Progress exported ✅"); }
  function importDialog() {
    var d = document.createElement("dialog"); d.innerHTML = '<h3>Import progress</h3><input type="file" accept=".json,application/json" id="impf"><textarea id="impt" placeholder="…or paste JSON"></textarea><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn" id="impc">Cancel</button><button class="btn primary" id="impo">Import</button></div>';
    document.body.appendChild(d); d.showModal();
    $("#impf", d).onchange = function (e) { var f = e.target.files[0]; if (f) f.text().then(function (t) { $("#impt", d).value = t; }); };
    $("#impc", d).onclick = function () { d.close(); d.remove(); };
    $("#impo", d).onclick = function () { try { var j = JSON.parse($("#impt", d).value); if (j.app !== "Vic's Math Arcade" || !j._state || j._state.v !== 1) throw new Error("not a Math Arcade save"); S = j._state; save(); d.close(); d.remove(); view = "home"; render(); toast("Imported ✅"); } catch (err) { toast("That file didn't work: " + err.message); } };
  }

  /* ---------- fx (confetti pattern adapted from HSPT Quest) ---------- */
  var cv = $("#fx"), cx = cv.getContext("2d"), parts = [], raf = null;
  function burst(x, y, n) { if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; cv.width = innerWidth; cv.height = innerHeight; var cols = ["#ffcc29", "#ff5d5d", "#3ec5ff", "#4ade80", "#a78bfa", "#ffffff"]; for (var i = 0; i < n; i++) parts.push({ x: x, y: y, vx: (Math.random() - .5) * 11, vy: -Math.random() * 10 - 2, r: Math.random() * 5 + 2.5, c: cols[i % cols.length], a: Math.random() * 6, life: 0 }); if (!raf) tick(); }
  function tick() { cx.clearRect(0, 0, cv.width, cv.height); parts = parts.filter(function (p) { return p.life < 90; }); parts.forEach(function (p) { p.life++; p.vy += .32; p.x += p.vx; p.y += p.vy; p.a += .2; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.globalAlpha = 1 - p.life / 90; cx.fillStyle = p.c; cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); cx.restore(); }); raf = parts.length ? requestAnimationFrame(tick) : null; if (!raf) cx.clearRect(0, 0, cv.width, cv.height); }
  function floatXp(t, x, y) { var d = document.createElement("div"); d.className = "xpfloat"; d.textContent = t; d.style.left = (x - 40) + "px"; d.style.top = (y - 10) + "px"; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1200); }
  var tt; function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 2600); }
  var actx; function chime(ok) { if (!S.sound) return; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = ok ? 880 : 330; g.gain.value = .05; o.connect(g); g.connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .25); o.stop(actx.currentTime + .26); } catch (e) {} }

  // test / automation hook (read-only views + same actions a player can take)
  window.__arcade = { calm: function () { parts = []; cx.clearRect(0, 0, cv.width, cv.height); $("#toast").classList.remove("show"); document.querySelectorAll(".xpfloat").forEach(function (d) { d.remove(); }); }, current: function () { return cur(); }, state: function () { return S; }, exportData: exportData, view: function () { return view; }, session: function () { return sess && { mode: sess.mode, i: sess.i, hp: sess.hp, lives: sess.lives, answered: sess.answered, over: !!sess.over }; } };
  S = load(); if (unlockedThemes().indexOf(S.theme) < 0) S.theme = "backyard"; render();
})();
