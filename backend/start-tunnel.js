/**
 * start-tunnel.js
 * Starts a Cloudflare Quick Tunnel (no account needed).
 * Far more stable than Localtunnel — no dropped connections or subdomain conflicts.
 *
 * Usage: node start-tunnel.js  OR  npm run tunnel
 *
 * After starting, copy the new *.trycloudflare.com URL into:
 *   mobile-app/.env  →  EXPO_PUBLIC_API_URL=https://<url>/api
 * Then restart Expo with: npx expo start -c
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5000;

// ── Wait for the local Express server to be ready ──────────────────────────
function waitForServer(maxAttempts = 15) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          console.log(`[Tunnel] ✅ Local server is ready on port ${PORT}`);
          resolve();
        } else {
          retry();
        }
      });
      req.setTimeout(2000);
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
    };

    const retry = () => {
      attempts++;
      if (attempts >= maxAttempts) {
        reject(new Error(`Server on port ${PORT} not responding after ${maxAttempts} attempts. Start it first with: npm run dev`));
        return;
      }
      console.log(`[Tunnel] ⏳ Waiting for backend server... (${attempts}/${maxAttempts})`);
      setTimeout(check, 3000);
    };

    check();
  });
}

// ── Start cloudflared quick tunnel ─────────────────────────────────────────
function startCloudflareTunnel() {
  return new Promise((resolve, reject) => {
    console.log(`\n[Tunnel] 🚀 Starting Cloudflare Quick Tunnel on port ${PORT}...`);

    const cf = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    let urlFound = '';

    const onData = (data) => {
      const text = data.toString();

      // Extract the tunnel URL from cloudflared's output
      const match = text.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        urlFound = match[0];
        resolved = true;

        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║  ✅  Cloudflare Tunnel is LIVE!                  ║');
        console.log(`║  🌐  ${urlFound.padEnd(44)}  ║`);
        console.log(`║  🏥  ${(urlFound + '/api/health').padEnd(44)}  ║`);
        console.log('╠══════════════════════════════════════════════════╣');
        console.log('║  📱  Update mobile-app/.env:                     ║');
        console.log(`║  EXPO_PUBLIC_API_URL=${(urlFound + '/api').padEnd(27)}  ║`);
        console.log('║  Then run: npx expo start -c                     ║');
        console.log('╚══════════════════════════════════════════════════╝\n');

        resolve({ process: cf, url: urlFound });
      }
    };

    cf.stdout.on('data', onData);
    cf.stderr.on('data', onData); // cloudflared logs to stderr

    cf.on('error', (err) => {
      if (err.code === 'ENOENT') {
        console.error('[Tunnel] ❌ cloudflared not found. Installing...');
        reject(new Error('cloudflared not installed. Run: npm install -g cloudflared'));
      } else {
        reject(err);
      }
    });

    cf.on('close', (code) => {
      if (!resolved) {
        reject(new Error(`cloudflared exited with code ${code} before a URL was assigned.`));
      } else {
        console.warn('[Tunnel] ⚠️  Cloudflare tunnel process ended unexpectedly. Restarting...');
        setTimeout(main, 3000);
      }
    });

    // Timeout if no URL in 30 seconds
    setTimeout(() => {
      if (!resolved) {
        cf.kill();
        reject(new Error('Timed out waiting for Cloudflare tunnel URL (30s).'));
      }
    }, 30000);
  });
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await waitForServer();
    const { url } = await startCloudflareTunnel();

    // Keep process alive and periodically health-check the tunnel
    setInterval(async () => {
      try {
        const res = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${PORT}/api/health`, resolve).on('error', reject);
        });
        if (res.statusCode !== 200) throw new Error(`status ${res.statusCode}`);
      } catch {
        console.warn('[Tunnel] ⚠️  Local server health check failed. Is the backend still running?');
      }
    }, 30000);

  } catch (error) {
    console.error(`[Tunnel] ❌ ${error.message}`);
    console.log('[Tunnel] Retrying in 5 seconds...\n');
    setTimeout(main, 5000);
  }
}

process.on('SIGINT', () => {
  console.log('\n[Tunnel] Shutting down...');
  process.exit(0);
});

main();
