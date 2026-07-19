(function(){
  var form = document.getElementById('contact-form');
  var successEl = document.getElementById('contact-success');
  var errorBanner = document.getElementById('contact-error-banner');
  var submitBtn = document.getElementById('contact-submit-btn');
  var noteEl = document.getElementById('contact-form-note');

  function setError(key, msg){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = msg;
  }
  function clearError(key){
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.textContent = '';
  }

  function validate(){
    var firstInvalid = null;
    errorBanner.classList.remove('visible');

    Array.prototype.forEach.call(form.querySelectorAll('[required]'), function(f){
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
      errorBanner.textContent = 'Please fill in the required fields above.';
      errorBanner.classList.add('visible');
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    noteEl.textContent = '';

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        message: document.getElementById('message').value.trim()
      })
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
        submitBtn.textContent = 'Send message';
        noteEl.textContent = "Something went wrong sending that. Please try again in a moment.";
      });
  });
})();
