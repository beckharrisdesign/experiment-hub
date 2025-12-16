// Configuration - Update this URL when deploying the hub
const HUB_API_URL = 'https://experiment-hub.replit.app';

// Form state
let selectedSeedCount = '';
let selectedChallenges = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  setupSeedCountButtons();
  setupChallengeButtons();
  setupFormSubmission();
});

// Seed count button handling
function setupSeedCountButtons() {
  const buttons = document.querySelectorAll('.seed-count-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      const value = this.dataset.seedCount;
      
      // Toggle selection
      if (selectedSeedCount === value) {
        selectedSeedCount = '';
        this.classList.remove('bg-primary-600', 'text-white', 'border-primary-600', 'shadow-md');
        this.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
      } else {
        // Deselect all
        buttons.forEach(b => {
          b.classList.remove('bg-primary-600', 'text-white', 'border-primary-600', 'shadow-md');
          b.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
        });
        // Select this one
        selectedSeedCount = value;
        this.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
        this.classList.add('bg-primary-600', 'text-white', 'border-primary-600', 'shadow-md');
      }
      
      document.getElementById('seedCount').value = selectedSeedCount;
    });
  });
}

// Challenge button handling (multi-select)
function setupChallengeButtons() {
  const buttons = document.querySelectorAll('.challenge-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      const value = this.dataset.challenge;
      const index = selectedChallenges.indexOf(value);
      
      if (index > -1) {
        // Remove from selection
        selectedChallenges.splice(index, 1);
        this.classList.remove('bg-primary-600', 'text-white', 'border-primary-600', 'shadow-md');
        this.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
      } else {
        // Add to selection
        selectedChallenges.push(value);
        this.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
        this.classList.add('bg-primary-600', 'text-white', 'border-primary-600', 'shadow-md');
      }
      
      document.getElementById('challenge').value = selectedChallenges.join(', ');
    });
  });
}

// Form submission
function setupFormSubmission() {
  const form = document.getElementById('waitlist-form');
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    const formData = {
      email: document.getElementById('email').value,
      name: document.getElementById('name').value || '',
      seedCount: selectedSeedCount,
      challenge: selectedChallenges,
      experiment: 'simple-seed-organizer',
      source: 'landing-page',
      optedIn: true
    };
    
    try {
      const response = await fetch(HUB_API_URL + '/api/landing-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      // Show success message
      document.getElementById('form-container').classList.add('hidden');
      document.getElementById('success-container').classList.remove('hidden');
      
      // Track Meta Pixel CompleteRegistration event
      if (typeof fbq !== 'undefined') {
        fbq('track', 'CompleteRegistration', {
          value: 0.25,
          currency: 'USD',
        });
      }
      
      // Track Google Analytics conversion
      if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submission', {
          event_category: 'engagement',
          event_label: 'early_access_signup',
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Something went wrong. Please try again.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}
