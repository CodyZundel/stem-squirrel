(function(){
  var form = document.getElementById('app-form');
  var successEl = document.getElementById('app-success');
  var errorBanner = document.getElementById('app-error-banner');
  var submitBtn = document.getElementById('app-submit-btn');
  var answers = {};

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

      if (btn.dataset.otherToggle === 'true'){
        var reveal = document.querySelector('.other-reveal[data-other-for="' + key + '"]');
        if (reveal){
          var isPressed = btn.getAttribute('aria-pressed') === 'true';
          reveal.classList.toggle('visible', isPressed);
        }
      }
    });
  });

  function setError(key, msg){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = msg;
  }
  function clearError(key){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = '';
  }

  // ---------- Ranking widget ----------
  var rankWarning = document.getElementById('rank-duplicate-warning');
  var rankSelects = document.querySelectorAll('.rank-select');
  function checkRankDuplicates(){
    var used = {};
    var hasDupe = false;
    rankSelects.forEach(function(sel){
      if (!sel.value) return;
      if (used[sel.value]) hasDupe = true;
      used[sel.value] = true;
    });
    rankWarning.classList.toggle('visible', hasDupe);
  }
  rankSelects.forEach(function(sel){
    sel.addEventListener('change', checkRankDuplicates);
  });

  function gatherRanking(){
    var result = [];
    rankSelects.forEach(function(sel){
      result.push({ item: sel.dataset.item, rank: sel.value || null });
    });
    result.sort(function(a, b){
      if (!a.rank) return 1;
      if (!b.rank) return -1;
      return parseInt(a.rank, 10) - parseInt(b.rank, 10);
    });
    return result.map(function(r){
      return r.item + (r.rank ? ' (' + r.rank + ')' : ' (unranked)');
    }).join(', ');
  }

  // ---------- Sliders ----------
  function wireSlider(sliderId, valId){
    var slider = document.getElementById(sliderId);
    var val = document.getElementById(valId);
    slider.addEventListener('input', function(){
      val.textContent = slider.value;
    });
  }
  wireSlider('s6-consistency-slider', 's6-consistency-val');
  wireSlider('s9-confidence-slider', 's9-confidence-val');
  wireSlider('s9-control-slider', 's9-control-val');

  // ---------- Validation (only name + email are required) ----------
  function validate(){
    var firstInvalid = null;
    errorBanner.classList.remove('visible');

    Array.prototype.forEach.call(form.querySelectorAll('input[required]'), function(f){
      if (!f.value.trim()){
        setError(f.id, 'This field is required.');
        if (!firstInvalid) firstInvalid = f;
      } else {
        clearError(f.id);
      }
    });

    var emailField = document.getElementById('email');
    if (emailField.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())){
      setError('email', 'Please enter a valid email.');
      if (!firstInvalid) firstInvalid = emailField;
    }

    if (firstInvalid){
      errorBanner.textContent = 'A couple required fields still need answers \u2014 check above.';
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
    function otherAppend(key, otherId){
      var arr = answers[key] || [];
      var other = val(otherId);
      return other ? arr.concat(['Other: ' + other]) : arr;
    }

    return {
      fullName: val('full-name'),
      email: val('email'),

      s1TestDate: val('s1-test-date'),
      s1Flexibility: answers.s1Flexibility || '',
      s1GoalScore: val('s1-goal-score'),
      s1WhyGoal: val('s1-why-goal'),
      s1Schools: val('s1-schools'),

      s2Major: val('s2-major'),
      s2GradYear: val('s2-grad-year'),
      s2Prereqs: otherAppend('s2Prereqs', 's2Prereqs-other'),
      s2Struggled: val('s2-struggled'),
      s2Natural: val('s2-natural'),

      s3Official: val('s3-official'),
      s3Retake: val('s3-retake'),
      s3FlCount: val('s3-fl-count'),
      s3RecentScores: val('s3-recent-scores'),
      s3Conditions: val('s3-conditions'),
      s3Timing: answers.s3Timing || '',
      s3Strongest: answers.s3Strongest || '',
      s3Weakest: answers.s3Weakest || '',

      s4WeakAreas: val('s4-weak-areas'),
      s4ContentReview: answers.s4ContentReview || '',
      s4ErrorType: answers.s4ErrorType || '',

      s5Owned: otherAppend('s5Owned', 's5Owned-other'),
      s5Regular: val('s5-regular'),
      s5Helpful: val('s5-helpful'),
      s5Disappointing: val('s5-disappointing'),
      s5Budget: answers.s5Budget || '',

      s6TypicalWeek: val('s6-typical-week'),
      s6Hours: val('s6-hours'),
      s6PassiveActive: val('s6-passive-active'),
      s6Consistency: document.getElementById('s6-consistency-slider').value,
      s6ConsistencyBlocker: val('s6-consistency-blocker'),
      s6ReviewMissed: val('s6-review-missed'),
      s6ReviewFrequency: answers.s6ReviewFrequency || '',
      s6ErrorLog: answers.s6ErrorLog || '',
      s6ErrorLogDetail: val('s6-error-log-detail'),
      s6BestTime: val('s6-best-time'),
      s6Distraction: val('s6-distraction'),

      s7Ranking: gatherRanking(),
      s7Confused: val('s7-confused'),
      s7TeachingStyle: val('s7-teaching-style'),

      s8Currently: otherAppend('s8Currently', 's8Currently-other'),
      s8CommittedHours: val('s8-committed-hours'),
      s8Sleep: val('s8-sleep'),
      s8Exercise: answers.s8Exercise || '',
      s8Caffeine: val('s8-caffeine'),
      s8OtherResponsibilities: val('s8-other-responsibilities'),
      s8SupportSystem: answers.s8SupportSystem || '',
      s8WantAccountability: answers.s8WantAccountability || '',
      s8Health: val('s8-health'),
      s8OtherFactors: val('s8-other-factors'),

      s9Confidence: document.getElementById('s9-confidence-slider').value,
      s9Control: document.getElementById('s9-control-slider').value,
      s9Fear: val('s9-fear'),
      s9Motivation: val('s9-motivation'),
      s9DisappointingResponse: val('s9-disappointing-response'),
      s9TestAnxiety: answers.s9TestAnxiety || '',

      s10WhyCoach: val('s10-why-coach'),
      s10PastCoaching: val('s10-past-coaching'),
      s10HopeFor: val('s10-hope-for'),
      s10CommMethod: answers.s10CommMethod || [],
      s10CommFrequency: val('s10-comm-frequency'),
      s10AnythingElse: val('s10-anything-else')
    };
  }

  // ---------- Submit ----------
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    fetch('/api/client-intake', {
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
        submitBtn.textContent = 'Submit intake';
        errorBanner.textContent = "Something went wrong submitting this. Please try again in a moment, or just text me directly.";
        errorBanner.classList.add('visible');
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
  });
})();
