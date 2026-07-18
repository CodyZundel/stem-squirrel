// Cloudflare Worker entry point.
//
// Because of "run_worker_first": ["/api/*"] in wrangler.jsonc, this script
// only runs for requests under /api/* — every other request (all your
// static HTML/CSS/JS files) is served directly from static assets and
// never touches this file at all.

import { handleApply } from './apply.js';
import { handleSubscribe } from './subscribe.js';
import { handleClientIntake } from './client-intake.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/apply') {
      if (request.method !== 'POST') return methodNotAllowed();
      return handleApply(request, env);
    }

    if (url.pathname === '/api/subscribe') {
      if (request.method !== 'POST') return methodNotAllowed();
      return handleSubscribe(request, env);
    }

    if (url.pathname === '/api/client-intake') {
      if (request.method !== 'POST') return methodNotAllowed();
      return handleClientIntake(request, env);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function methodNotAllowed() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
