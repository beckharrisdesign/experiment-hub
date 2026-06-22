// Best Day Ever landing — waitlist signup via Supabase Auth
// Creates an auth user so landing signups and future app logins share the same account.
var SUPABASE_URL =
  typeof window !== "undefined" && window.SUPABASE_URL
    ? window.SUPABASE_URL
    : "";
var SUPABASE_PUBLISHABLE_KEY =
  typeof window !== "undefined" && window.SUPABASE_PUBLISHABLE_KEY
    ? window.SUPABASE_PUBLISHABLE_KEY
    : "";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("waitlist-form");
  if (!form) return;

  const formContainer = document.getElementById("form-container");
  const successContainer = document.getElementById("success-container");
  const formError = document.getElementById("form-error");
  const formErrorTitle = document.getElementById("form-error-title");
  const formErrorDetails = document.getElementById("form-error-details");

  function hideError() {
    if (formError) {
      formError.classList.add("hidden");
      if (formErrorDetails) formErrorDetails.textContent = "";
    }
  }

  function showError(title, details) {
    hideError();
    if (formErrorTitle)
      formErrorTitle.textContent = title || "I couldn't add you to the list.";
    if (formErrorDetails) formErrorDetails.textContent = details || "";
    if (formError) formError.classList.remove("hidden");
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideError();

    const submitBtn = document.getElementById("submit-btn");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Adding to early access list…";
    submitBtn.disabled = true;

    const email = document.getElementById("email").value.trim();
    const name = document.getElementById("name").value.trim();
    const calendar = form.querySelector('input[name="calendar"]:checked');
    const paperUsage = form.querySelector('input[name="paperUsage"]:checked');
    const hardestPart = document.getElementById("hardestPart")?.value?.trim();

    try {
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error("Supabase not configured");
      }

      const client = supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
      );
      const { error } = await client.auth.signUp({
        email,
        password: crypto.randomUUID(),
        options: {
          data: {
            name: name || undefined,
            calendar: calendar?.value || undefined,
            paper_usage: paperUsage?.value || undefined,
            hardest_part: hardestPart || undefined,
            source: "landing-page",
            experiment: "best-day-ever",
          },
        },
      });

      if (error) {
        showError(
          "I couldn't add you to the list.",
          "Check your connection and try again. If the problem continues, email us directly.",
        );
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

      formContainer.classList.add("hidden");
      successContainer.classList.remove("hidden");

      if (typeof gtag !== "undefined") {
        gtag("event", "form_submission", {
          event_category: "engagement",
          event_label: "early_access_signup",
        });
      }
      if (typeof fbq !== "undefined") {
        fbq("track", "CompleteRegistration", { value: 0.25, currency: "USD" });
      }
    } catch (err) {
      console.error("Submit error:", err);
      showError(
        "I couldn't add you to the list.",
        "Check your connection and try again.",
      );
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});
