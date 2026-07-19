// Handles POST /api/contact — receives the contact form message and emails
// it to stemsquirrel@gmail.com via Resend. Uses the same RESEND_API_KEY
// secret as apply.js and client-intake.js — no additional setup needed if
// that's already configured. No captcha here since this form is public
// but low-value to spam (no financial action, easy to ignore junk in an
// inbox) — add Turnstile later if it becomes a problem.

const TO_EMAIL = 'stemsquirrel@gmail.com';
const FROM_EMAIL = 'applications@stemsquirrel.com'; // same verified sender as apply.js

export async function handleContact(request, env) {
  let data;
  try {
    data = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';

  if (!name || !email || !message) {
    return jsonResponse({ error: 'Name, email, and message are required' }, 400);
  }

  if (!isValidEmail(email)) {
    return jsonResponse({ error: 'A valid email is required' }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse({ error: 'Server is not configured (missing API key)' }, 500);
  }

  const html = renderEmailHtml({ name, email, message });

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + env.RESEND_API_KEY
      },
      body: JSON.stringify({
        from: 'STEM Squirrel Contact Form <' + FROM_EMAIL + '>',
        to: [TO_EMAIL],
        reply_to: email,
        subject: 'New contact form message — ' + name,
        html: html
      })
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      return jsonResponse({ error: 'Resend request failed', detail: errText }, resendResponse.status);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: 'Could not reach Resend' }, 502);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function esc(v){
  if (v === undefined || v === null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderEmailHtml(d){
  return '' +
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;">' +
  '<h1 style="font-size:20px;color:#14231A;margin:0 0 4px;">New contact form message</h1>' +
  '<p style="color:#5B6358;font-size:13px;margin:0 0 20px;">From ' + esc(d.name) + ' (' + esc(d.email) + ')</p>' +
  '<div style="background:#F8F6EF;border:1px solid #E2E0D3;border-radius:10px;padding:18px 20px;font-size:14px;color:#1B2A20;white-space:pre-wrap;line-height:1.6;">' +
    esc(d.message) +
  '</div>' +
'</div>';
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
