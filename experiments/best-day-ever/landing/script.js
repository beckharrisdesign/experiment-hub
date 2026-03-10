// Best Day Ever landing — form submission to Experiment Hub
// Submits to: API_BASE + '/api/landing-submission' → hub creates a page in Notion (NOTION_LANDING_DATABASE_ID).
var API_BASE = (typeof window !== 'undefined' && window.HUB_API_URL !== undefined) ? window.HUB_API_URL : '';

var SUBMIT_URL = (API_BASE || '') + '/api/landing-submission';

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('waitlist-form');
  if (!form) return;

  const formContainer = document.getElementById('form-container');
  const successContainer = document.getElementById('success-container');
  const formError = document.getElementById('form-error');
  const formErrorTitle = document.getElementById('form-error-title');
  const formErrorDetails = document.getElementById('form-error-details');
  const successPageId = document.getElementById('success-page-id');

  function hideError() {
    if (formError) {
      formError.classList.add('hidden');
      if (formErrorDetails) formErrorDetails.textContent = '';
    }
  }

  function showError(title, details) {
    hideError();
    if (formErrorTitle) formErrorTitle.textContent = title || 'Something went wrong';
    if (formErrorDetails) formErrorDetails.textContent = details || '';
    if (formError) formError.classList.remove('hidden');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding to early access list…';
    submitBtn.disabled = true;

    const calendar = form.querySelector('input[name="calendar"]:checked');
    const paperUsage = form.querySelector('input[name="paperUsage"]:checked');

    const notesParts = [];
    if (calendar?.value) notesParts.push('Calendar: ' + calendar.value);
    if (paperUsage?.value) notesParts.push('Paper usage: ' + paperUsage.value);
    const hardestPart = document.getElementById('hardestPart')?.value?.trim();
    if (hardestPart) notesParts.push('Hardest part: ' + hardestPart);
    const notes = notesParts.length ? notesParts.join(' | ') : undefined;

    const formData = {
      experiment: 'Best Day Ever',
      email: document.getElementById('email').value,
      name: document.getElementById('name').value || '',
      source: 'landing-page',
      notes,
    };

    try {
      var response = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      var data = await response.json().catch(function () { return {}; });

      if (!response.ok) {
        var details = data.details || data.error || ('Submission failed (' + response.status + ')');
        showError(data.error || 'Submission failed', details);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

      // Success: show confirmation in place of the form
      formContainer.classList.add('hidden');
      successContainer.classList.remove('hidden');
      if (successPageId && data.pageId) {
        var msg = 'Saved to landing signup list. Notion page ID: ' + data.pageId;
        if (data.target) msg += ' (target: ' + data.target + ')';
        successPageId.textContent = msg;
      }

      if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submission', { event_category: 'engagement', event_label: 'early_access_signup' });
      }
      if (typeof fbq !== 'undefined') {
        fbq('track', 'CompleteRegistration', { value: 0.25, currency: 'USD' });
      }
    } catch (err) {
      console.error('Submit error:', err);
      showError('Something went wrong', err.message || 'Please try again.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});
