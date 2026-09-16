// Local stand-in for Vercel's serverless function runtime during `npm run
// dev`. `vercel dev` is the "official" way to run /api/* locally, but it
// proved unreliable in some local setups (functions never responding). This
// runs the exact same handler modules directly over plain Node http, so
// local testing doesn't depend on the Vercel CLI at all. Not used in
// production — Vercel deploys api/*.ts as real serverless functions.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const PORT = 3001;
const ROOT = path.resolve(import.meta.dirname, '..');

const envPath = path.join(ROOT, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

const routes: Record<string, () => Promise<{ GET: (req: Request) => Promise<Response> }>> = {
  '/api/news': () => import('../api/news.ts'),
  '/api/call-report': () => import('../api/call-report.ts'),
  '/api/complaints': () => import('../api/complaints.ts'),
  '/api/branch-rating': () => import('../api/branch-rating.ts'),
  '/api/branches': () => import('../api/branches.ts'),
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const loadHandler = routes[url.pathname];
  if (!loadHandler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const mod = await loadHandler();
    const request = new Request(url, { method: req.method });
    const response = await mod.GET(request);
    const body = await response.text();
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    });
    res.end(body);
  } catch (err) {
    console.error(`Error handling ${url.pathname}:`, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Local API dev server ready at http://localhost:${PORT}`);
  console.log('Routes:', Object.keys(routes).join(', '));
});
