#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/home/ubuntu/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter(Boolean);
const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chrome) {
  console.error("No Chromium/Chrome executable found. Set CHROME_BIN to run smoke:desktop-avatar.");
  process.exit(1);
}

const port = Number(process.env.NAIS_SMOKE_CDP_PORT ?? 9320 + Math.floor(Math.random() * 500));
const baseDevUrl = process.env.NAIS_SMOKE_URL ?? "http://127.0.0.1:1420";
const smokePackId = process.env.NAIS_SMOKE_PACK_ID ?? "pixiv-vrm-sample";
const expectedPackName = process.env.NAIS_SMOKE_EXPECTED_PACK_NAME ?? "Pixiv VRM Sample";
const devUrl = `${baseDevUrl}${baseDevUrl.includes("?") ? "&" : "?"}naisSmokePack=${encodeURIComponent(smokePackId)}`;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nais-chrome-"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Retry until timeout.
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function connectPageCdp() {
  const response = await waitFor(`http://127.0.0.1:${port}/json`);
  const pages = await response.json();
  const page = pages.find((entry) => entry.type === "page") ?? pages[0];
  if (!page?.webSocketDebuggerUrl) throw new Error("No page CDP websocket available");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    const onMessage = (event) => {
      const message = JSON.parse(event.data.toString());
      if (message.id !== messageId) return;
      ws.removeEventListener("message", onMessage);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

  return { ws, send };
}

const chromeProcess = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
  "--use-gl=swiftshader",
  "--remote-debugging-address=127.0.0.1",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  devUrl,
], { stdio: ["ignore", "pipe", "pipe"] });

try {
  await waitFor(`http://127.0.0.1:${port}/json/version`);
  const { ws, send } = await connectPageCdp();
  const exceptions = [];
  const failedRequests = [];
  const consoleMessages = [];
  const consoleErrors = [];

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data.toString());
    if (message.method === "Runtime.exceptionThrown") {
      exceptions.push(message.params.exceptionDetails?.text ?? "runtime exception");
    }
    if (message.method === "Network.loadingFailed") {
      const failed = message.params;
      if (failed.errorText !== "net::ERR_ABORTED") failedRequests.push(failed);
    }
    if (message.method === "Runtime.consoleAPICalled") {
      consoleMessages.push(message.params);
      if (["error", "warning"].includes(message.params.type)) {
        consoleErrors.push({
          type: message.params.type,
          text: message.params.args?.map((arg) => arg.value ?? arg.description ?? arg.type).join(" ") ?? "",
        });
      }
    }
  });

  await send("Runtime.enable");
  await send("Network.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: devUrl });
  await sleep(6_000);

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "evaluation failed");
    return result.result.value;
  };

  const state = await evaluate(`(() => ({
    body: document.body.innerText,
    canvasCount: document.querySelectorAll('.avatar-render-host canvas').length,
    avatarLive: document.body.innerText.includes('connected · avatar live'),
    selectedPack: document.body.innerText.includes(${JSON.stringify(expectedPackName)}),
    placeholder: Boolean(document.querySelector('.avatar-placeholder')),
    hostHtml: document.querySelector('.avatar-render-host')?.innerHTML?.slice(0, 200) ?? '',
  }))()`);

  const passed = state.selectedPack
    && state.avatarLive
    && state.canvasCount > 0
    && exceptions.length === 0
    && failedRequests.length === 0;

  console.log(JSON.stringify({
    passed,
    state,
    exceptions,
    failedRequests: failedRequests.map(({ errorText, blockedReason, type, requestId }) => ({
      errorText,
      blockedReason,
      type,
      requestId,
    })),
    consoleMessageCount: consoleMessages.length,
    consoleErrors,
  }, null, 2));

  ws.close();
  chromeProcess.kill("SIGTERM");
  process.exit(passed ? 0 : 1);
} catch (error) {
  chromeProcess.kill("SIGTERM");
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
}
