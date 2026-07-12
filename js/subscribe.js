// Cloudflare Pages Function — POST /api/subscribe
//
// Keeps the MailerLite API key server-side. The browser never sees it.
//
// SETUP REQUIRED (one time, in the Cloudflare dashboard):
//   Workers & Pages → your project → Settings → Environment variables
//   Add a variable named MAILERLITE_API_KEY, type "Secret", value = your
//   MailerLite API key (Integrations → MailerLite API → Generate new token).
//   Add it for both Production and Preview environments.
//
// Optional: set MAILERLITE_GROUP_ID the same way if you want people who
// book through this flow added to a specific MailerLite group.

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!email || !isValidEmail(email)) {
    return jsonResponse({ error: 'A valid email is required' }, 400);
  }

  if (!env.MAILERLITE_API_KEY) {
    return jsonResponse({ error: 'Server is not configured (missing API key)' }, 500);
  }

  const payload = {
    email: email,
    fields: name ? { name: name } : undefined
  };
  if (env.MAILERLITE_GROUP_ID) {
    payload.groups = [env.MAILERLITE_GROUP_ID];
  }

  try {
    const mlResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + env.MailerLite_API_Key
      },
      body: JSON.stringify(payload)
    });

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      return jsonResponse({ error: 'MailerLite request failed', detail: errText }, mlResponse.status);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: 'Could not reach MailerLite' }, 502);
  }
}

// Reject any method other than POST.
export async function onRequestGet() {
  return jsonResponse({ error: 'Method not allowed' }, 405);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
