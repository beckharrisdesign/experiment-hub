import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Simple Seed Organizer',
  description: 'Terms of Service for Simple Seed Organizer.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb] pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-2xl font-bold text-[#101828] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#6a7282] mb-8">Last updated: March 2026</p>

        <div className="prose prose-sm text-[#374151] space-y-6">
          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">1. Acceptance of Terms</h2>
            <p>
              By using Simple Seed Organizer ("the Service"), you agree to these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">2. Description of Service</h2>
            <p>
              Simple Seed Organizer is a seed inventory tracking tool for home gardeners. The
              Service allows you to store, organize, and retrieve information about your seed
              collection.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the security of your account credentials. You
              must notify us immediately of any unauthorized access to your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">4. Payments & Subscriptions</h2>
            <p>
              Paid plans are billed annually. Subscriptions renew automatically unless cancelled.
              Refunds are issued at our discretion within 7 days of purchase. Payments are
              processed securely by Stripe.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">5. User Data</h2>
            <p>
              Your seed inventory data belongs to you. We do not sell or share your data with
              third parties except as required to operate the Service (e.g., hosting, payments).
              See our <a href="/privacy" className="text-[#16a34a] hover:underline">Privacy Policy</a> for details.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">6. Acceptable Use</h2>
            <p>
              You agree not to misuse the Service, attempt to gain unauthorized access, or use the
              Service in any way that violates applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">7. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. We do not guarantee
              uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we are not liable for any indirect,
              incidental, or consequential damages arising from use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">9. Changes to Terms</h2>
            <p>
              We may update these terms at any time. Continued use of the Service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#101828] mb-2">10. Contact</h2>
            <p>
              Questions about these terms? Contact us at{' '}
              <a href="mailto:hello@simpleseedorganizer.com" className="text-[#16a34a] hover:underline">
                hello@simpleseedorganizer.com
              </a>
              .
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
