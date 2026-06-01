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
        <p className="text-sm text-[#6a7282] mb-8">Last updated: June 2026</p>

        <div className="prose prose-sm text-[#374151] space-y-6">
          <section>
            <p>
              Simple Seed Organizer (&ldquo;the Service&rdquo;) is operated by Beck Harris Design
              (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what we collect, how we use
              it, and the third parties that help us run the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">1. What We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> your email address and password, managed by Supabase Auth (we never store your password ourselves)</li>
              <li><strong>Seed inventory data:</strong> seed names, varieties, growing notes, and any photos you upload</li>
              <li><strong>Uploaded photos:</strong> seed-packet and seed photos you upload are stored in our Supabase storage and may be served from public URLs</li>
              <li><strong>Payment data:</strong> billing details are handled by Stripe — we never see or store your card details</li>
              <li><strong>Usage data:</strong> page views and feature interactions, collected via Google Analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">2. How We Use It</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and operate the Service</li>
              <li>To process payments and manage your subscription</li>
              <li>To send transactional emails (account confirmation, password reset)</li>
              <li>
                To read your uploaded seed-packet photos and enrich your seed entries using AI. Photos
                and seed text you submit for these features are sent to OpenAI for processing (see
                Third-Party Services)
              </li>
              <li>To understand how the app is used and improve it</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">3. Third-Party Services</h2>
            <p className="mb-2">We share data with these providers only as needed to run the Service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — database, authentication, and photo storage</li>
              <li><strong>OpenAI</strong> — AI reading of seed-packet photos and enrichment of seed entries</li>
              <li><strong>Stripe</strong> — payment and subscription processing</li>
              <li><strong>Google Analytics</strong> — usage analytics</li>
              <li><strong>Vercel</strong> — application hosting</li>
            </ul>
            <p className="mt-2">We do not sell your personal data.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">4. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. You may request deletion of
              your account and all associated data at any time by emailing us (see Contact); we will
              action deletion requests within 30 days.
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
              You may request access to, correction of, export of, or deletion of your personal data
              at any time. To make a request, email us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">7. Contact</h2>
            <p>
              Privacy questions or data requests?{' '}
              <a href="mailto:katy@beckharrisdesign.com" className="text-[#16a34a] hover:underline">
                katy@beckharrisdesign.com
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
