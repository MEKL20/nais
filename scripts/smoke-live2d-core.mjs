#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chrome = [
  process.env.CHROME_BIN,
  "/home/ubuntu/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((c) => c && fs.existsSync(c));
if (!chrome) { console.error("No Chrome"); process.exit(1); }

const port = Number(process.env.NAIS_SMOKE_CDP_PORT ?? 9320 + Math.floor(Math.random() * 500));
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nais-cubism-"));
const testUrl = "http://127.0.0.1:1420/cubism-core-test.html";

async function waitFor(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout: ${url}`);
}

async function connectPageCdp() {
  const res = await waitFor(`http://127.0.0.1:${port}/json`);
  const pages = await res.json();
  const page = pages.find((e) => e.type === "page") ?? pages[0];
  if (!page?.webSocketDebuggerUrl) throw new Error("No CDP websocket");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.addEventListener("open", r, { once: true });
    ws.addEventListener("error", j, { once: true });
  });

  let id = 0;
  const send = (method, params = {}) => new Promise((r, j) => {
    const mid = ++id;
    const handler = (ev) => {
      const x = JSON.parse(ev.data);
      if (x.id !== mid) return;
      ws.removeEventListener("message", handler);
      x.error ? j(new Error(JSON.stringify(x.error))) : r(x.result);
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  return { ws, send };
}

const chromeProcess = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist", "--use-gl=swiftshader",
  "--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
], { stdio: ["ignore", "pipe", "pipe"] });

try {
  await waitFor(`http://127.0.0.1:${port}/json/version`);
  const { ws, send } = await connectPageCdp();
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: testUrl });
  await new Promise((r) => setTimeout(r, 5000));

  const result = await send("Runtime.evaluate", {
    expression: `document.getElementById("out") ? document.getElementById("out").textContent : document.body.innerText`,
    awaitPromise: true,
    returnByValue: true,
  });

  console.log(JSON.stringify({ passed: true, result }, null, 2));
  ws.close();
  chromeProcess.kill("SIGTERM");
} catch (err) {
  chromeProcess.kill("SIGTERM");
  console.error(err.stack);
  process.exit(1);
}
