// Minimal Chrome DevTools Protocol driver for Vic's Math Arcade tests (Node 20: --experimental-websocket).
// Same approach as the HSPT Quest helper, written separately for this project. Uses a throwaway Chrome profile.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function launch(port = 9461) {
  const prof = mkdtempSync(join(tmpdir(), "mathcdp-"));
  const proc = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--mute-audio", `--remote-debugging-port=${port}`,
    `--user-data-dir=${prof}`, "--window-size=1280,800", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 120 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {} }
  if (!target) { proc.kill(); throw new Error("chrome did not start"); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener("message", (m) => { const j = JSON.parse(m.data);
    if (j.id && pending.has(j.id)) { pending.get(j.id)(j); pending.delete(j.id); }
    if (j.method === "Runtime.exceptionThrown") errors.push(j.params.exceptionDetails.exception?.description || j.params.exceptionDetails.text);
    if (j.method === "Runtime.consoleAPICalled" && j.params.type === "error") errors.push("console.error: " + j.params.args.map((a) => a.value ?? a.description).join(" ")); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, (j) => r(j.result || {})); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable");
  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval failed: " + expr.slice(0, 90) + " :: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value; };
  const viewport = (w, h, mobile = false, scale = 1) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: scale, mobile });
  const goto = async (url, wait = 1000) => { await send("Page.navigate", { url }); await sleep(wait); };
  const shot = async (path, full = false) => { const p = { format: "png" };
    if (full) { const m = await send("Page.getLayoutMetrics"); const c = m.cssContentSize || m.contentSize; p.clip = { x: 0, y: 0, width: c.width, height: c.height, scale: 1 }; p.captureBeyondViewport = true; }
    const r = await send("Page.captureScreenshot", p); writeFileSync(path, Buffer.from(r.data, "base64")); };
  const close = async () => { try { ws.close(); } catch {} proc.kill(); await sleep(300); rmSync(prof, { recursive: true, force: true }); };
  return { send, ev, viewport, goto, shot, close, errors };
}
