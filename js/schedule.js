(function(){
  var TOTAL_STEPS = 11; // intake questions; booking is the +1 final screen
  var current = 0;
  var answers = {};

  var stepEls = Array.prototype.slice.call(document.querySelectorAll('#intake-form .step'));
  var bookingEl = document.getElementById('step-booking');
  var formNav = document.getElementById('form-nav');
  var btnNext = document.getElementById('btn-next');
  var btnBack = document.getElementById('btn-back');
  var btnBackFinal = document.getElementById('btn-back-final');
  var stepIndicator = document.getElementById('step-indicator');
  var stepTotalEl = document.getElementById('step-total');
  var rulerTicks = document.getElementById('ruler-ticks');
  var rulerFill = document.getElementById('ruler-fill');
  var intakeForm = document.getElementById('intake-form');

  stepTotalEl.textContent = TOTAL_STEPS;

  var icons = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M8 6l4-4 4 4"/></svg>', // 0 name
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>', // 1 test date/score
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>', // 2 prep stage
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V6a2 2 0 012-2h5v17H6a2 2 0 01-2-2z"/><path d="M20 19V6a2 2 0 00-2-2h-5v17h5a2 2 0 002-2z"/></svg>', // 3 academic background
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/></svg>', // 4 prior testing
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>', // 5 diagnostic
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>', // 6 study time/format
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V4h13l-3 4 3 4H5"/></svg>', // 7 goals/schools
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3 11.2V16h6v-1.8A6 6 0 0012 3z"/></svg>', // 8 learning style
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.35-9.5-8.5C.5 7.5 3 4 6.5 4 9 4 11 6 12 7c1-1 3-3 5.5-3C21 4 23.5 7.5 21.5 11.5 19 15.65 12 20 12 20z"/></svg>', // 9 life context/accommodations
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>', // 10 contact
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14l2 2 4-4"/></svg>' // 11 booking
  ];

  for (var i = 0; i <= TOTAL_STEPS; i++){
    var node = document.createElement('div');
    node.className = 'tick-node';
    node.id = 'tick-' + i;
    node.innerHTML = icons[i];
    rulerTicks.appendChild(node);
  }

  function renderRuler(){
    var pct = (current / TOTAL_STEPS) * 100;
    rulerFill.style.height = pct + '%';
    rulerFill.style.setProperty('--fillw', pct + '%');
    rulerFill.style.width = pct + '%';
    for (var i = 0; i <= TOTAL_STEPS; i++){
      var node = document.getElementById('tick-' + i);
      node.classList.toggle('done', i < current);
      node.classList.toggle('active', i === current);
    }
  }

  function showStep(index){
    stepEls.forEach(function(el){
      el.classList.toggle('active', parseInt(el.dataset.step,10) === index);
    });
    var isBooking = index === TOTAL_STEPS;
    bookingEl.classList.toggle('active', isBooking);
    formNav.style.display = isBooking ? 'none' : 'flex';
    btnBack.disabled = index === 0;
    stepIndicator.textContent = Math.min(index + 1, TOTAL_STEPS);
    btnNext.textContent = index === TOTAL_STEPS - 1 ? 'Continue to booking' : 'Continue';
    renderRuler();
    if (isBooking) populateSummaryAndCalendly();
    var firstField = document.querySelector('#step-' + index + ' input, #step-' + index + ' select, #step-' + index + ' textarea, #step-' + index + ' .choice');
    if (firstField) firstField.focus();
  }

  function clearError(key){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = '';
  }
  function setError(key, msg){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = msg;
  }

  // Harvest every plain input/select/textarea in a step into `answers`,
  // keyed by element id. Choice-groups are handled separately below
  // since they're button-based, not native form fields.
  function harvestStep(index){
    var stepEl = document.getElementById('step-' + index);
    if (!stepEl) return;
    var fields = stepEl.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="date"], select, textarea');
    fields.forEach(function(f){
      answers[f.id] = f.value.trim();
    });
  }

  // Delegated click handling for every .choice-grid on the page. Each grid
  // carries data-key (where the answer is stored) and each button carries
  // data-value. Clicking toggles aria-pressed within just that grid.
  document.querySelectorAll('.choice-grid').forEach(function(grid){
    grid.addEventListener('click', function(e){
      var btn = e.target.closest('.choice');
      if (!btn) return;
      Array.prototype.forEach.call(grid.querySelectorAll('.choice'), function(c){
        c.setAttribute('aria-pressed', 'false');
      });
      btn.setAttribute('aria-pressed', 'true');
      answers[grid.dataset.key] = btn.dataset.value;
      clearError(grid.dataset.key);
    });
  });

  function validateStep(index){
    harvestStep(index);

    if (index === 0){
      if (!answers['user-name']){ setError('user-name', 'Please enter your name.'); return false; }
      clearError('user-name');
    }
    if (index === 2){
      if (!answers.prepStage){ setError('prep-stage', 'Please choose one.'); return false; }
      clearError('prep-stage');
    }
    if (index === 10){
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers['user-email'] || '');
      if (!emailOk){ setError('user-email', 'Please enter a valid email.'); return false; }
      clearError('user-email');
      answers.subscribe = document.getElementById('subscribe-optin').checked;
    }
    return true;
  }

  btnNext.addEventListener('click', function(){
    if (!validateStep(current)) return;
    current = Math.min(current + 1, TOTAL_STEPS);
    showStep(current);
  });
  btnBack.addEventListener('click', function(){
    current = Math.max(current - 1, 0);
    showStep(current);
  });
  btnBackFinal.addEventListener('click', function(){
    current = TOTAL_STEPS - 1;
    showStep(current);
  });

  // Allow Enter key to advance on text/select inputs (not textarea)
  intakeForm.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA'){
      e.preventDefault();
      btnNext.click();
    }
  });

  function line(label, value){
    return value ? (label + ': ' + value + '<br>') : '';
  }

  function populateSummaryAndCalendly(){
    var summary = document.getElementById('booking-summary');
    summary.innerHTML =
      line('Name', answers['user-name']) +
      line('Test date', answers['test-date']) +
      line('Goal score', answers['goal-score']) +
      line('Prep stage', answers.prepStage) +
      line('Major', answers.major) +
      line('Prereqs', answers.prereqs) +
      line('Prior testing', answers.priorTesting) +
      line('Recent score', answers['recent-score']) +
      line('Strongest section', answers['strongest-section']) +
      line('Weakest section', answers['weakest-section']) +
      line('Biggest challenge', answers.challenge) +
      line('Study hours/week', answers.hours) +
      line('Format', answers.format) +
      line('Target schools', answers['target-schools']) +
      line('Application cycle', answers.cycle) +
      line('Learning style', answers.learningStyle) +
      line('Pace preference', answers.pace) +
      line('Contact preference', answers.contactPref) +
      line('Email', answers['user-email']);

    // Prefill Calendly: name + email always work.
    // Custom questions (a1, a2...) only prefill if your Calendly event type
    // has matching custom questions configured, in the same order.
    var embed = document.getElementById('calendly-embed');
    var baseUrl = embed.dataset.url.split('?')[0];
    var params = new URLSearchParams();
    if (answers['user-name']) params.set('name', answers['user-name']);
    if (answers['user-email']) params.set('email', answers['user-email']);
    if (answers.prepStage) params.set('a1', answers.prepStage);
    if (answers.challenge) params.set('a2', answers.challenge);
    if (answers['goal-score']) params.set('a3', answers['goal-score']);
    if (answers['test-date']) params.set('a4', answers['test-date']);
    embed.dataset.url = baseUrl + '?' + params.toString();
  }

  showStep(0);

  // --- Auto-subscribe on booking completion ---
  // Calendly's inline widget posts a message to the parent window when the
  // invitee finishes scheduling. We listen for that, then (only if the
  // opt-in checkbox was checked) call our own Cloudflare Pages Function,
  // which holds the MailerLite API key server-side. See functions/api/subscribe.js.
  window.addEventListener('message', function(e){
    if (e.origin !== 'https://calendly.com') return;
    if (!(e.data && e.data.event === 'calendly.event_scheduled')) return;
    if (!answers.subscribe || !answers['user-email']) return;

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: answers['user-email'],
        name: answers['user-name'] || ''
      })
    }).catch(function(err){
      // Booking already succeeded via Calendly regardless of this call,
      // so we only log — never block or alarm the user over a failed subscribe.
      console.error('Subscribe request failed:', err);
    });
  });
})();
