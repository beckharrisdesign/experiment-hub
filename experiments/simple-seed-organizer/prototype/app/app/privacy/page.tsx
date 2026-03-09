import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Simple Seed Organizer',
  description: 'Privacy Policy for Simple Seed Organizer.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb] pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-2xl font-bold text-[#101828] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#6a7282] mb-8">Last updated: March 2026</p>

        <div className="prose prose-sm text-[#374151] space-y-6">
          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">1. What We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> email address and hashed password (via Supabase Auth)</li>
              <li><strong>Seed inventory data:</strong> seed names, varieties, notes, and photos you enter</li>
              <li><strong>Payment data:</strong> billing information processed by Stripe — we never see your card details</li>
              <li><strong>Usage data:</strong> page views and feature interactions via Google Analytics (anonymized)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">2. How We Use It</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and operate the Service</li>
              <li>To process payments and manage your subscription</li>
              <li>To send transactional emails (account confirmation, password reset)</li>
              <li>To understand how the app is used and improve it</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">3. Third-Party Services</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — database and authentication hosting</li>
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>Google Analytics</strong> — anonymized usage analytics</li>
              <li><strong>Vercel</strong> — application hosting</li>
            </ul>
            <p className="mt-2">We do not sell your data to any third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">4. Data Retention</h2>
            <p>
              Your data is retained for as long as your account is active. You may delete your
              account and all associated data at any time from your profile settings.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">5. Cookies</h2>
            <p>
              We use cookies for authentication session management (Supabase) and analytics
              (Google Analytics). No advertising cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">6. Your Rights</h2>
            <p>
              You may access, correct, or delete your personal data at any time. To request data
              deletion, contact us or delete your account from the profile page.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">7. Contact</h2>
            <p>
              Privacy questions?{' '}
              <a href="mailto:hello@simpleseedorganizer.com" className="text-[#16a34a] hover:underline">
                hello@simpleseedorganizer.com
              </a>
            </p>
          </section>
        </div>

        <p className="mt-10 text-xs text-[#9ca3af]">
          <em>This is a placeholder document. Replace with reviewed legal content before launch.</em>
        </p>
      </div>
    </div>
  );
}
