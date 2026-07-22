/**
 * dev.js — One-command launcher for RVR Blood Bank
 * ─────────────────────────────────────────────────
 * Run from project root:  node dev.js
 *
 * This script:
 *  1. Starts the backend (nodemon server.js)
 *  2. Waits until the backend health endpoint is ready
 *  3. Starts a Cloudflare Quick Tunnel
 *  4. Captures the assigned tunnel URL
 *  5. Automatically writes it to mobile-app/.env
 *  6. Tells you exactly what to do next in Expo
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT = __dirname;
const BACKEND_DIR = path.join(ROOT, 'backend');
const MOBILE_DIR = path.join(ROOT, 'mobile-app');
const FRONTEND_ENV = path.join(ROOT, 'mobile-app', '.env');
const BACKEND_PORT = 5000;

// Track the running Expo process so we can restart it on tunnel URL change
let expoProcess = null;

// ── Colours for console output ───────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m',
};
const log = (tag, color, msg) =>
  console.log(`${color}[${tag}]${C.reset} ${msg}`);

// ── 1. Start the backend with nodemon (only if not already running) ──────────
async function ensureBackend() {
  // First check if backend is already up
  const alreadyUp = await isBackendReady();
  if (alreadyUp) {
    log('Backend', C.green, `✅ Already running on port ${BACKEND_PORT} — skipping launch`);
    return;
  }

  log('Backend', C.cyan, 'Starting backend server (nodemon)...');
  const backend = spawn(
    'npx',
    ['nodemon', '--quiet', 'server.js'],
    {
      cwd: BACKEND_DIR,
      env: { ...process.env, FORCE_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    }
  );

  backend.stdout.on('data', (d) =>
    process.stdout.write(`${C.cyan}[Backend]${C.reset} ${d}`)
  );
  backend.stderr.on('data', (d) =>
    process.stderr.write(`${C.cyan}[Backend]${C.reset} ${d}`)
  );
  backend.on('close', (code) => {
    log('Backend', C.red, `Process exited with code ${code}.`);
  });
}

// ── 2. Check if backend is already ready ──────────────────────────────────────
function isBackendReady() {
  return new Promise((resolve) => {
    const req = http.get(
      `http://localhost:${BACKEND_PORT}/api/health`,
      (res) => resolve(res.statusCode === 200)
    );
    req.setTimeout(2000);
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

// ── 2. Wait for the backend health endpoint ───────────────────────────────────
function waitForBackend(maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const try_ = () => {
      const req = http.get(
        `http://localhost:${BACKEND_PORT}/api/health`,
        (res) => {
          if (res.statusCode === 200) {
            log('Backend', C.green, `✅ Ready on port ${BACKEND_PORT}`);
            resolve();
          } else {
            wait();
          }
        }
      );
      req.setTimeout(2000);
      req.on('error', wait);
      req.on('timeout', () => { req.destroy(); wait(); });
    };
    const wait = () => {
      attempts++;
      if (attempts >= maxAttempts) {
        reject(new Error(`Backend not ready after ${maxAttempts} attempts.`));
        return;
      }
      log('Backend', C.yellow, `⏳ Waiting... (attempt ${attempts}/${maxAttempts})`);
      setTimeout(try_, 3000);
    };
    try_();
  });
}

// ── 3. Start Cloudflare tunnel + capture URL ─────────────────────────────────
function startTunnel() {
  return new Promise((resolve, reject) => {
    log('Tunnel', C.magenta, 'Starting Cloudflare Quick Tunnel...');

    const cf = spawn(
      'cloudflared',
      ['tunnel', '--url', `http://localhost:${BACKEND_PORT}`],
      { stdio: ['ignore', 'pipe', 'pipe'], shell: true }
    );

    let resolved = false;

    const scan = (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        const tunnelUrl = match[0];
        resolve({ process: cf, url: tunnelUrl });
      }
    };

    cf.stdout.on('data', scan);
    cf.stderr.on('data', scan); // cloudflared logs to stderr

    cf.on('error', (err) => {
      if (!resolved) reject(err);
    });

    cf.on('close', (code) => {
      if (!resolved) {
        reject(new Error(`cloudflared exited prematurely (code ${code}).`));
      } else {
        log('Tunnel', C.red, '⚠️  Tunnel closed. Restarting in 5s...');
        setTimeout(async () => {
          try {
            const { url } = await startTunnel();
            writeFrontendEnv(url);
            log('Tunnel', C.green, `✅ New tunnel URL: ${url}`);
            // Automatically restart Expo so the new URL is baked into the bundle.
            // Previously this was left to the developer — causing "Network Error"
            // because the old URL was still cached in the Metro bundle.
            startExpo();
          } catch (e) {
            log('Tunnel', C.red, e.message);
          }
        }, 5000);
      }
    });

    // Safety timeout
    setTimeout(() => {
      if (!resolved) {
        cf.kill();
        reject(new Error('Timed out waiting for tunnel URL (30s).'));
      }
    }, 30000);
  });
}

// ── 4. Write the new URL into mobile-app/.env ────────────────────────────────
function writeFrontendEnv(tunnelUrl) {
  const apiUrl = `${tunnelUrl}/api`;
  const content = `EXPO_PUBLIC_API_URL=${apiUrl}\n`;
  fs.writeFileSync(FRONTEND_ENV, content, 'utf8');
  log('Config', C.green, `✅ mobile-app/.env updated → ${apiUrl}`);
}

// ── 5. Start (or restart) the Expo dev server ────────────────────────────────
// Uses -c flag to clear the Metro cache so the new EXPO_PUBLIC_API_URL is
// always picked up. Without -c, Metro serves a stale bundle with the old URL.
function startExpo() {
  // Kill the previous Expo process if one is running
  if (expoProcess) {
    log('Expo', C.yellow, '🔄 Restarting Expo to pick up new tunnel URL...');
    try { expoProcess.kill('SIGTERM'); } catch (_) {}
    expoProcess = null;
  } else {
    log('Expo', C.cyan, 'Starting Expo dev server (with cache clear)...');
  }

  expoProcess = spawn(
    'npx',
    ['expo', 'start', '-c'],
    {
      cwd: MOBILE_DIR,
      env: { ...process.env, FORCE_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    }
  );

  expoProcess.stdout.on('data', (d) =>
    process.stdout.write(`${C.green}[Expo]${C.reset} ${d}`)
  );
  expoProcess.stderr.on('data', (d) =>
    process.stderr.write(`${C.green}[Expo]${C.reset} ${d}`)
  );
  expoProcess.on('close', (code) => {
    if (code !== null) {
      log('Expo', C.red, `Process exited with code ${code}.`);
      expoProcess = null;
    }
  });

  return expoProcess;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.green}═══════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.green}  🩸 RVR Blood Bank — Dev Launcher         ${C.reset}`);
  console.log(`${C.bold}${C.green}═══════════════════════════════════════════${C.reset}\n`);

  try {
    // Step 1: Start backend if not already running
    await ensureBackend();

    // Step 2: Wait for backend to be fully ready (if we just launched it)
    let ready = await isBackendReady();
    let attempts = 0;
    while (!ready && attempts < 20) {
      attempts++;
      log('Backend', C.yellow, `⏳ Waiting for backend to be ready... (${attempts}/20)`);
      await new Promise(r => setTimeout(r, 3000));
      ready = await isBackendReady();
    }
    if (!ready) throw new Error('Backend never became ready. Is it starting correctly?');
    log('Backend', C.green, '✅ Backend is ready!');

    // Step 3: Start tunnel
    const { url } = await startTunnel();

    // Step 4: Save URL to frontend .env
    writeFrontendEnv(url);

    // Step 5: Start Expo automatically (cache-cleared so new URL is baked in)
    startExpo();

    // Step 6: Print status panel
    const apiUrl = `${url}/api`;
    console.log(`\n${C.bold}${C.green}╔═════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.green}║  ✅  Everything is running!                             ║${C.reset}`);
    console.log(`${C.bold}${C.green}╠═════════════════════════════════════════════════════════╣${C.reset}`);
    console.log(`${C.bold}${C.cyan}║  🌐  Tunnel URL : ${url.padEnd(38)}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║  🏥  Health     : ${(url + '/api/health').padEnd(38)}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║  📡  API URL    : ${apiUrl.padEnd(38)}║${C.reset}`);
    console.log(`${C.bold}${C.green}╠═════════════════════════════════════════════════════════╣${C.reset}`);
    console.log(`${C.bold}${C.green}║  📱  Expo is starting — scan the QR code above.        ║${C.reset}`);
    console.log(`${C.bold}${C.green}║  🔄  Tunnel reconnects will auto-restart Expo.          ║${C.reset}`);
    console.log(`${C.bold}${C.green}╚═════════════════════════════════════════════════════════╝${C.reset}\n`);

    // Keep process alive
    setInterval(() => {}, 1000 * 60 * 60);

  } catch (err) {
    log('Error', C.red, err.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(main, 5000);
  }
}

process.on('SIGINT', () => {
  console.log('\n\nShutting down all processes...');
  if (expoProcess) {
    try { expoProcess.kill('SIGTERM'); } catch (_) {}
  }
  process.exit(0);
});

main();
