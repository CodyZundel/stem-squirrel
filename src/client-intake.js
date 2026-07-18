// Handles POST /api/client-intake — receives the private post-acceptance
// client intake questionnaire and emails it to stemsquirrel@gmail.com via
// Resend. No captcha here: this endpoint is only ever reached from an
// unguessable, unlinked page URL sent directly to accepted clients, so the
// friction of a captcha isn't worth it. The Resend API key stays
// server-side; the browser never sees it.
//
// Uses the same RESEND_API_KEY secret as /api/apply — no additional setup
// needed if that's already configured.

const TO_EMAIL = 'stemsquirrel@gmail.com';
const FROM_EMAIL = 'applications@stemsquirrel.com'; // same verified sender as apply.js

export async function handleClientIntake(request, env) {
  let data;
  try {
    data = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!data.fullName || !data.email) {
    return jsonResponse({ error: 'Name and email are required' }, 400);
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
        from: 'StemSquirrel Client Intake <' + FROM_EMAIL + '>',
        to: [TO_EMAIL],
        reply_to: data.email,
        subject: 'Client Intake Completed — ' + data.fullName,
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
         '<td style="padding:6px 0;font-size:14px;color:#1B2A20;white-space:pre-wrap;">' + v + '</td></tr>';
}

function sectionHeader(title){
  return '<tr><td colspan="2" style="padding:22px 0 8px;font-size:13px;font-weight:600;color:#9C6A22;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #E2E0D3;">' + esc(title) + '</td></tr>';
}

function renderEmailHtml(d){
  return '' +
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;">' +
  '<h1 style="font-size:20px;color:#14231A;margin:0 0 4px;">Client Intake Completed</h1>' +
  '<p style="color:#5B6358;font-size:13px;margin:0 0 20px;">' + esc(d.fullName) + ' (' + esc(d.email) + ') — submitted via private intake link</p>' +
  '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">' +

    sectionHeader('1. Goals & Timeline') +
    row('Target test date', d.s1TestDate) +
    row('Date flexibility', d.s1Flexibility) +
    row('Goal score range', d.s1GoalScore) +
    row('Why that goal', d.s1WhyGoal) +
    row('Target schools', d.s1Schools) +

    sectionHeader('2. Academic Background') +
    row('Major', d.s2Major) +
    row('Grad year', d.s2GradYear) +
    row('Prereqs completed', list(d.s2Prereqs)) +
    row('Struggled with', d.s2Struggled) +
    row('Came naturally', d.s2Natural) +

    sectionHeader('3. MCAT History') +
    row('Official MCAT history', d.s3Official) +
    row('Retake reflection', d.s3Retake) +
    row('# full-lengths taken', d.s3FlCount) +
    row('Most recent scores by section', d.s3RecentScores) +
    row('Full-length test conditions', d.s3Conditions) +
    row('Timing pattern', d.s3Timing) +
    row('Strongest section', d.s3Strongest) +
    row('Weakest section', d.s3Weakest) +

    sectionHeader('4. Content Diagnostics') +
    row('Weakest content areas', d.s4WeakAreas) +
    row('Content review status', d.s4ContentReview) +
    row('Error type', d.s4ErrorType) +

    sectionHeader('5. Current Resources') +
    row('Resources owned', list(d.s5Owned)) +
    row('Used regularly', d.s5Regular) +
    row('Most helpful', d.s5Helpful) +
    row('Disappointing', d.s5Disappointing) +
    row('Budget for more', d.s5Budget) +

    sectionHeader('6. Study Habits') +
    row('Typical week', d.s6TypicalWeek) +
    row('Hours/week', d.s6Hours) +
    row('Passive vs active %', d.s6PassiveActive) +
    row('Consistency (1-10)', d.s6Consistency) +
    row('Consistency blocker', d.s6ConsistencyBlocker) +
    row('Reviews missed questions by', d.s6ReviewMissed) +
    row('Reviews old material', d.s6ReviewFrequency) +
    row('Keeps error log', d.s6ErrorLog) +
    row('Error log detail', d.s6ErrorLogDetail) +
    row('Best time of day', d.s6BestTime) +
    row('Biggest distraction', d.s6Distraction) +

    sectionHeader('7. Learning Style') +
    row('Ranking (most to least helpful)', d.s7Ranking) +
    row('When confused, does', d.s7Confused) +
    row('Teaching style that works', d.s7TeachingStyle) +

    sectionHeader('8. Lifestyle') +
    row('Currently', list(d.s8Currently)) +
    row('Hours/week committed to work/school', d.s8CommittedHours) +
    row('Sleep', d.s8Sleep) +
    row('Exercise', d.s8Exercise) +
    row('Caffeine/nutrition notes', d.s8Caffeine) +
    row('Other responsibilities', d.s8OtherResponsibilities) +
    row('Support system', d.s8SupportSystem) +
    row('Wants accountability partner', d.s8WantAccountability) +
    row('Health notes', d.s8Health) +
    row('Other factors', d.s8OtherFactors) +

    sectionHeader('9. Mindset') +
    row('Confidence in reaching goal (1-10)', d.s9Confidence) +
    row('Sense of control over score (1-10)', d.s9Control) +
    row('Biggest fear', d.s9Fear) +
    row('What motivates them', d.s9Motivation) +
    row('Response to bad practice exam', d.s9DisappointingResponse) +
    row('Test-day anxiety', d.s9TestAnxiety) +

    sectionHeader('10. Coaching') +
    row('Why hire a coach', d.s10WhyCoach) +
    row('Past coaching/tutoring experience', d.s10PastCoaching) +
    row('Hopes coach helps with most', d.s10HopeFor) +
    row('Preferred communication', list(d.s10CommMethod)) +
    row('Communication frequency', d.s10CommFrequency) +
    row('Anything else', d.s10AnythingElse) +

  '</table>' +
'</div>';
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
