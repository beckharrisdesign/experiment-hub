// Configuration - Update this URL when deploying
// For development: Use the Replit dev URL (e.g., https://xxx.replit.dev)
// For production: Use the deployed hub URL (e.g., https://experiment-hub.replit.app)
const HUB_API_URL = '';  // Empty string = same origin (works when served from hub)

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
    
    // API expects: experiment, email (required)
    // Optional: name, source, optedIn, optOutReason
    // Any extra fields go into notes automatically
    const formData = {
      experiment: 'Simple Seed Organizer',
      email: document.getElementById('email').value,
      name: document.getElementById('name').value || '',
      source: 'landing-page',
      optedIn: true,
      // Custom fields - these get added to notes
      seedCount: selectedSeedCount,
      challenges: selectedChallenges,
    };
    
    try {
      const apiUrl = HUB_API_URL || '';
      const response = await fetch(apiUrl + '/api/landing-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Submission failed');
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
