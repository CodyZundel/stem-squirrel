(function(){
  var TOTAL_STEPS = 5; // intake questions; booking is the +1 final screen
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

  stepTotalEl.textContent = TOTAL_STEPS;

  var icons = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M8 6l4-4 4 4"/></svg>', // name
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>', // prep stage
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19h16M6 19V9l6-4 6 4v10"/></svg>', // focus area
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.35-9.5-8.5C.5 7.5 3 4 6.5 4 9 4 11 6 12 7c1-1 3-3 5.5-3C21 4 23.5 7.5 21.5 11.5 19 15.65 12 20 12 20z"/></svg>', // goals
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>', // contact
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>' // booking
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
    var firstInput = document.querySelector('#step-' + index + ' input, #step-' + index + ' select, #step-' + index + ' textarea');
    if (firstInput) firstInput.focus();
  }

  function clearError(key){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = '';
  }
  function setError(key, msg){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = msg;
  }

  function validateStep(index){
    if (index === 0){
      var v = document.getElementById('user-name').value.trim();
      if (!v){ setError('user-name', 'Please enter your name.'); return false; }
      clearError('user-name');
      answers.name = v;
    }
    if (index === 1){
      if (!answers.prepStage){ setError('prep-stage', 'Please choose one.'); return false; }
      clearError('prep-stage');
    }
    if (index === 2){
      var s = document.getElementById('focus-area').value;
      if (!s){ setError('focus-area', 'Please select a focus area.'); return false; }
      clearError('focus-area');
      answers.focusArea = s;
    }
    if (index === 3){
      answers.goals = document.getElementById('goals').value.trim();
    }
    if (index === 4){
      var email = document.getElementById('user-email').value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk){ setError('user-email', 'Please enter a valid email.'); return false; }
      clearError('user-email');
      answers.email = email;
      answers.phone = document.getElementById('user-phone').value.trim();
      answers.subscribe = document.getElementById('subscribe-optin').checked;
    }
    return true;
  }

  document.getElementById('prep-choices').addEventListener('click', function(e){
    var btn = e.target.closest('.choice');
    if (!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll('.choice'), function(c){
      c.setAttribute('aria-pressed', 'false');
    });
    btn.setAttribute('aria-pressed', 'true');
    answers.prepStage = btn.dataset.value;
    clearError('prep-stage');
  });

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
  document.getElementById('intake-form').addEventListener('keydown', function(e){
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA'){
      e.preventDefault();
      btnNext.click();
    }
  });

  function populateSummaryAndCalendly(){
    var summary = document.getElementById('booking-summary');
    summary.innerHTML =
      'Name: ' + (answers.name || '—') + '<br>' +
      'Prep stage: ' + (answers.prepStage || '—') + '<br>' +
      'Focus area: ' + (answers.focusArea || '—') + '<br>' +
      'Email: ' + (answers.email || '—');

    // Prefill Calendly: name + email always work.
    // Custom questions (a1, a2...) only prefill if your Calendly event type
    // has matching custom questions configured, in the same order.
    var embed = document.getElementById('calendly-embed');
    var baseUrl = embed.dataset.url.split('?')[0];
    var params = new URLSearchParams();
    if (answers.name) params.set('name', answers.name);
    if (answers.email) params.set('email', answers.email);
    if (answers.prepStage) params.set('a1', answers.prepStage);
    if (answers.focusArea) params.set('a2', answers.focusArea);
    if (answers.goals) params.set('a3', answers.goals);
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
    if (!answers.subscribe || !answers.email) return;

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: answers.email,
        name: answers.name || ''
      })
    }).catch(function(err){
      // Booking already succeeded via Calendly regardless of this call,
      // so we only log — never block or alarm the user over a failed subscribe.
      console.error('Subscribe request failed:', err);
    });
  });
})();
