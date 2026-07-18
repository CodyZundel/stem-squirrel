(function(){
  var form = document.getElementById('app-form');
  var successEl = document.getElementById('app-success');
  var errorBanner = document.getElementById('app-error-banner');
  var submitBtn = document.getElementById('app-submit-btn');
  var answers = {}; // keyed by data-key for chip groups; other fields read at submit time

  // ---------- Chip groups (single-select and multi-select) ----------
  document.querySelectorAll('.chip-grid').forEach(function(grid){
    var key = grid.dataset.key;
    var isMulti = grid.dataset.multi === 'true';
    if (isMulti) answers[key] = [];

    grid.addEventListener('click', function(e){
      var btn = e.target.closest('.chip');
      if (!btn) return;
      var value = btn.dataset.value;

      if (isMulti){
        var pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        var arr = answers[key];
        var idx = arr.indexOf(value);
        if (pressed && idx > -1) arr.splice(idx, 1);
        if (!pressed && idx === -1) arr.push(value);
      } else {
        Array.prototype.forEach.call(grid.querySelectorAll('.chip'), function(c){
          c.setAttribute('aria-pressed', 'false');
        });
        btn.setAttribute('aria-pressed', 'true');
        answers[key] = value;
      }

      clearError(key);
      handleConditionalReveals(key, btn, value, isMulti);
    });
  });

  function clearError(key){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = '';
  }
  function setError(key, msg){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = msg;
  }

  // ---------- "Other, please specify" reveals ----------
  function handleConditionalReveals(key, btn, value, isMulti){
    if (btn.dataset.otherToggle === 'true'){
      var reveal = document.querySelector('.other-reveal[data-other-for="' + key + '"]');
      if (reveal){
        var isPressed = btn.getAttribute('aria-pressed') === 'true';
        reveal.classList.toggle('visible', isPressed);
      }
    }

    // Section 4 branching: "I can't stay consistent." / "I'm not motivated to study."
    if (key === 'problems'){
      var pressedConsistency = answers.problems.indexOf("I can't stay consistent.") > -1;
      var pressedMotivation = answers.problems.indexOf("I'm not motivated to study.") > -1;
      document.getElementById('reveal-consistency').classList.toggle('visible', pressedConsistency);
      document.getElementById('reveal-motivation').classList.toggle('visible', pressedMotivation);
    }
  }

  // ---------- "I haven't planned a date yet" disables the date field ----------
  var testDateInput = document.getElementById('test-date');
  var noTestDateCheckbox = document.getElementById('no-test-date');
  noTestDateCheckbox.addEventListener('change', function(){
    testDateInput.disabled = noTestDateCheckbox.checked;
    if (noTestDateCheckbox.checked) testDateInput.value = '';
  });

  // ---------- Confidence slider ----------
  var slider = document.getElementById('confidence-slider');
  var sliderVal = document.getElementById('confidence-val');
  slider.addEventListener('input', function(){
    sliderVal.textContent = slider.value;
  });

  // ---------- Required chip-group and text-field validation ----------
  function validate(){
    var firstInvalid = null;
    errorBanner.classList.remove('visible');

    // Required chip groups
    document.querySelectorAll('.chip-grid[data-required="true"]').forEach(function(grid){
      var key = grid.dataset.key;
      var isMulti = grid.dataset.multi === 'true';
      var val = answers[key];
      var missing = isMulti ? (!val || val.length === 0) : !val;
      if (missing){
        setError(key, 'Please select an option.');
        if (!firstInvalid) firstInvalid = grid;
      } else {
        clearError(key);
      }
    });

    // Required native fields (input[required], textarea[required])
    Array.prototype.forEach.call(form.querySelectorAll('input[required], textarea[required]'), function(f){
      var errKey = f.id;
      if (!f.value.trim()){
        setError(errKey, 'This field is required.');
        if (!firstInvalid) firstInvalid = f;
      } else {
        clearError(errKey);
      }
    });

    var emailField = document.getElementById('email');
    if (emailField.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())){
      setError('email', 'Please enter a valid email.');
      if (!firstInvalid) firstInvalid = emailField;
    }

    var turnstileField = document.querySelector('[name="cf-turnstile-response"]');
    if (!turnstileField || !turnstileField.value){
      setError('captcha', 'Please complete the verification above.');
      if (!firstInvalid) firstInvalid = document.querySelector('.cf-turnstile');
    } else {
      clearError('captcha');
    }

    if (firstInvalid){
      errorBanner.textContent = 'A few required fields still need answers — check the highlighted questions above.';
      errorBanner.classList.add('visible');
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  // ---------- Gather full payload ----------
  function gatherPayload(){
    function val(id){
      var el = document.getElementById(id);
      return el ? el.value.trim() : '';
    }

    var turnstileField = document.querySelector('[name="cf-turnstile-response"]');

    var resourcesOther = val('resources-other');
    var currentStatusOther = val('currentStatus-other');
    var problemsOther = val('problems-other');

    return {
      fullName: val('full-name'),
      email: val('email'),
      phone: val('phone'),
      contactMethod: answers.contactMethod || '',
      cityState: val('city-state'),
      coachingFormat: answers.coachingFormat || '',
      referral: val('referral'),

      takenBefore: answers.takenBefore || '',
      recentScore: val('recent-score'),
      goalScore: val('goal-score'),
      testDate: noTestDateCheckbox.checked ? "Hasn't planned a date yet" : val('test-date'),
      studyStatus: answers.studyStatus || '',

      resources: (answers.resources || []).concat(resourcesOther ? ['Other: ' + resourcesOther] : []),
      studyHours: answers.studyHours || '',
      currentStatus: (answers.currentStatus || '') + (currentStatusOther ? (' (' + currentStatusOther + ')') : ''),
      priorHelp: val('prior-help'),

      weakestSection: answers.weakestSection || '',
      problems: (answers.problems || []).concat(problemsOther ? ['Other: ' + problemsOther] : []),
      consistencyDetail: val('consistency-detail'),
      motivationDetail: val('motivation-detail'),
      confidence: slider.value,
      feedbackStory: val('feedback-story'),

      whyPhysician: val('why-physician'),
      goalMeaning: val('goal-meaning'),
      whyCoaching: val('why-coaching'),
      alreadyTried: val('already-tried'),
      readyCommit: answers.readyCommit || '',
      financiallyReady: answers.financiallyReady || '',

      hopingFor: val('hoping-for'),
      anythingElse: val('anything-else'),

      turnstileToken: turnstileField ? turnstileField.value : ''
    };
  }

  // ---------- Submit ----------
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gatherPayload())
    })
      .then(function(res){
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      })
      .then(function(){
        form.style.display = 'none';
        successEl.classList.add('visible');
        successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function(){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit application';
        errorBanner.textContent = "Something went wrong sending your application. Please try again, or text (435) 730-0050 directly.";
        errorBanner.classList.add('visible');
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (window.turnstile) window.turnstile.reset();
      });
  });
})();
