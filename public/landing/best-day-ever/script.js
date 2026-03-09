// Best Day Ever landing — form submission to Experiment Hub
// Development: use same origin when served from hub (e.g. proxy or same host)
// Production: set to your deployed hub URL (e.g. https://your-hub.vercel.app)
const HUB_API_URL = '';

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('waitlist-form');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
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
      const response = await fetch((HUB_API_URL || '') + '/api/landing-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Submission failed');
      }

      document.getElementById('form-container').classList.add('hidden');
      document.getElementById('success-container').classList.remove('hidden');

      if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submission', { event_category: 'engagement', event_label: 'early_access_signup' });
      }
      if (typeof fbq !== 'undefined') {
        fbq('track', 'CompleteRegistration', { value: 0.25, currency: 'USD' });
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Something went wrong. Please try again.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});
