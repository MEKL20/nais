#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chromeCandidates = [
  process.env.CHROME_BIN,
  "/home/ubuntu/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter(Boolean);
const chrome = chromeCandidates.find((c) => fs.existsSync(c));
if (!chrome) {
  console.error("No Chromium found. Set CHROME_BIN.");
  process.exit(1);
}

const port = Number(process.env.NAIS_SMOKE_CDP_PORT ?? 9320 + Math.floor(Math.random() * 500));
const devUrl = `http://127.0.0.1:1420/live2d-simple-test.html`;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nais-live2d-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForUrl(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await new Promise((res, rej) => {
        const req = require("http").request(url, (r) => { res(r); });
        req.on("error", rej);
        req.end();
      });
      let body = "";
      await new Promise((resolve) => {
        res.on("data", (d) => { body += d; });
        res.on("end", resolve);
      });
      res.body = body;
      return res;
    } catch { await sleep(100); }
  }
  throw new Error(`Timeout: ${url}`);
}

async function connectPageCdp() {
  const res = await waitForUrl(`http://127.0.0.1:${port}/json`);
  const pages = JSON.parse(res.body);
  const page = pages.find((e) => e.type === "page") ?? pages[0];
  if (!page?.webSocketDebuggerUrl) throw new Error("No CDP websocket");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });

  let id = 0;
  const send = (method, params = {}) => new Promise((res, rej) => {
    const mid = ++id;
    ws.on("message", function handler(ev) {
      const m = JSON.parse(ev.toString());
      if (m.id !== mid) return;
      ws.off("message", handler);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  return { ws, send };
}

const chromeProcess = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist", "--use-gl=swiftshader",
  "--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`, devUrl,
], { stdio: ["ignore", "pipe", "pipe"] });

try {
  await waitForUrl(`http://127.0.0.1:${port}/json/version`);
  const { ws, send } = await connectPageCdp();
  await send("Runtime.enable");
  await send("Page.enable");

  await sleep(5000);

  const result = await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.getElementById('output');
      const text = el ? el.textContent : 'NO_OUTPUT_ELEMENT';
      return {
        outputText: text,
        hasLive2DCubismCore: typeof Live2DCubismCore !== 'undefined',
        live2DCoreKeys: typeof Live2DCubismCore !== 'undefined'
          ? Object.keys(Live2DCubismCore).slice(0, 10).join(', ') : 'N/A',
        windowLive2DCore: typeof window.Live2DCubismCore !== 'undefined',
        globalThisLive2DCore: typeof globalThis.Live2DCubismCore !== 'undefined',
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  console.log(JSON.stringify({
    diagnosticUrl: devUrl,
    pageState: result,
  }, null, 2));

  ws.close();
  chromeProcess.kill("SIGTERM");
} catch (err) {
  chromeProcess.kill("SIGTERM");
  console.error(err.stack);
  process.exit(1);
}
