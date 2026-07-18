// Cloudflare Pages Function — POST /api/apply
//
// Receives the MCAT coaching application, verifies the Cloudflare Turnstile
// captcha token, and emails the application to stemsquirrel@gmail.com via
// Resend. Both the Turnstile secret and the Resend API key stay server-side;
// the browser never sees them.
//
// SETUP REQUIRED (one time):
//   1. Cloudflare dashboard → Turnstile → Add a site. Choose "Managed"
//      widget type. Copy the SITE KEY into application.html
//      (search for YOUR_SITE_KEY in the cf-turnstile div) and the
//      SECRET KEY into the environment variable below.
//   2. Create a free account at https://resend.com
//   3. Verify a sending domain (Resend requires this to send from an
//      address like applications@stemsquirrel.com — using their shared
//      test domain works for testing but is not reliable for production).
//   4. Generate a Resend API key: Resend dashboard → API Keys → Create.
//   5. In Cloudflare: Workers & Pages → your project → Settings →
//      Environment variables → add both as Secrets, for both Production
//      and Preview:
//        RESEND_API_KEY
//        TURNSTILE_SECRET_KEY
//   6. Update FROM_EMAIL below once your domain is verified.

const TO_EMAIL = 'stemsquirrel@gmail.com';
const FROM_EMAIL = 'applications@stemsquirrel.com'; // update once your domain is verified in Resend

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!data.fullName || !data.email) {
    return jsonResponse({ error: 'Name and email are required' }, 400);
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    return jsonResponse({ error: 'Server is not configured (missing captcha secret)' }, 500);
  }

  const captchaOk = await verifyTurnstile(data.turnstileToken, env.TURNSTILE_SECRET_KEY, request);
  if (!captchaOk) {
    return jsonResponse({ error: 'Captcha verification failed' }, 403);
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse({ error: 'Server is not configured (missing API key)' }, 500);
  }

  const html = renderEmailHtml(data);

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + env.RESEND_API_KEY
      },
      body: JSON.stringify({
        from: 'StemSquirrel Applications <' + FROM_EMAIL + '>',
        to: [TO_EMAIL],
        reply_to: data.email,
        subject: 'New MCAT Coaching Application — ' + data.fullName,
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

export async function onRequestGet() {
  return jsonResponse({ error: 'Method not allowed' }, 405);
}

async function verifyTurnstile(token, secretKey, request) {
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.append('secret', secretKey);
    body.append('response', token);
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) body.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: body
    });
    const outcome = await res.json();
    return outcome.success === true;
  } catch (err) {
    return false;
  }
}

function esc(v){
  if (v === undefined || v === null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function list(arr){
  if (!arr || !arr.length) return '—';
  return esc(arr.join(', '));
}

function row(label, value){
  var v = (value === undefined || value === null || value === '') ? '—' : esc(value);
  return '<tr><td style="padding:6px 12px 6px 0;color:#5B6358;font-size:13px;white-space:nowrap;vertical-align:top;">' + esc(label) + '</td>' +
         '<td style="padding:6px 0;font-size:14px;color:#1B2A20;">' + v + '</td></tr>';
}

function sectionHeader(title){
  return '<tr><td colspan="2" style="padding:22px 0 8px;font-size:13px;font-weight:600;color:#9C6A22;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #E2E0D3;">' + esc(title) + '</td></tr>';
}

function renderEmailHtml(d){
  return '' +
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;">' +
  '<h1 style="font-size:20px;color:#14231A;margin:0 0 4px;">New MCAT Coaching Application</h1>' +
  '<p style="color:#5B6358;font-size:13px;margin:0 0 20px;">' + esc(d.fullName) + ' — submitted via stemsquirrel.com</p>' +
  '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">' +
    sectionHeader('Basic Information') +
    row('Full Name', d.fullName) +
    row('Email', d.email) +
    row('Phone', d.phone) +
    row('Preferred contact method', d.contactMethod) +
    row('City &amp; State', d.cityState) +
    row('Preferred coaching format', d.coachingFormat) +
    row('Referral source', d.referral) +

    sectionHeader('MCAT Background') +
    row('Taken MCAT before?', d.takenBefore) +
    row('Most recent score', d.recentScore) +
    row('Goal score', d.goalScore) +
    row('Planned test date', d.testDate) +
    row('Study status', d.studyStatus) +

    sectionHeader('Current Situation') +
    row('Resources in use', list(d.resources)) +
    row('Study hours/week', d.studyHours) +
    row('Current status', list(d.currentStatus)) +
    row('Prior tutor/course experience', d.priorHelp) +

    sectionHeader('Self-Assessment') +
    row('Weakest section', d.weakestSection) +
    row('Problems encountered', list(d.problems)) +
    row('Consistency detail', d.consistencyDetail) +
    row('Motivation detail', d.motivationDetail) +
    row('Confidence (1-10)', d.confidence) +
    row('Difficult feedback story', d.feedbackStory) +

    sectionHeader('Commitment') +
    row('Why become a physician', d.whyPhysician) +
    row('What goal score means', d.goalMeaning) +
    row('Why coaching vs. self-study', d.whyCoaching) +
    row('What they\u2019ve already tried', d.alreadyTried) +
    row('Ready to commit?', d.readyCommit) +
    row('Financially prepared?', d.financiallyReady) +

    sectionHeader('Fit') +
    row('Hoping coach helps with', d.hopingFor) +
    row('Anything else', d.anythingElse) +
  '</table>' +
'</div>';
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
