// Cloudflare Worker entry point.
//
// Because of "run_worker_first": ["/api/*"] in wrangler.jsonc, this script
// only runs for requests under /api/* — every other request (all your
// static HTML/CSS/JS files) is served directly from static assets and
// never touches this file at all.

import { handleApply } from './apply.js';
import { handleSubscribe } from './subscribe.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/debug-env') {
      // TEMPORARY — remove this route once the secrets issue is resolved.
      // Reports only true/false for each expected secret, never the values.
      return new Response(JSON.stringify({
        hasResend: !!env.RESEND_API_KEY,
        hasTurnstile: !!env.TURNSTILE_SECRET_KEY,
        hasMailerlite: !!env.MAILERLITE_API_KEY,
        hasMailerliteGroup: !!env.MAILERLITE_GROUP_ID
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/apply') {
      if (request.method !== 'POST') return methodNotAllowed();
      return handleApply(request, env);
    }

    if (url.pathname === '/api/subscribe') {
      if (request.method !== 'POST') return methodNotAllowed();
      return handleSubscribe(request, env);
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
