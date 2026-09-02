import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — BHD Labs",
  description:
    "What BHD Labs collects, why, and what happens to it. Plain language, no legal maze.",
};

const LAST_UPDATED = "September 1, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-relaxed text-text-secondary">
      {children}
    </p>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background-primary">
      <Header />
      <main className="flex-1 px-4 py-10 md:px-8 lg:px-16">
        <div className="mx-auto flex max-w-screen-md flex-col gap-10">
          <header className="flex flex-col gap-3">
            <h1 className="font-heading text-3xl font-semibold text-text-primary lg:text-4xl">
              Privacy policy
            </h1>
            <p className="text-sm text-text-muted">
              Last updated {LAST_UPDATED}
            </p>
          </header>

          <Section title="The short version">
            <P>
              BHD Labs is a small experiment site run by one person. It
              collects as little about you as it can, never sells your data,
              and you can email at any time to ask what it holds about you or
              to have it deleted.
            </P>
          </Section>

          <Section title="Who runs this site">
            <P>
              BHD Labs (labs.beckharrisdesign.com) is the experiment hub of
              Beck Harris Design, a one-person design studio. Anything in this
              policy that says &ldquo;we&rdquo; means that one person. Questions
              about this policy go to{" "}
              <a
                href="mailto:katy@beckharrisdesign.com"
                className="text-accent-primary hover:underline"
              >
                katy@beckharrisdesign.com
              </a>
              .
            </P>
          </Section>

          <Section title="What we collect and why">
            <ul className="flex list-disc flex-col gap-3 pl-5 text-[15px] leading-relaxed text-text-secondary">
              <li>
                <span className="font-medium text-text-primary">
                  Usage analytics.
                </span>{" "}
                The site uses Google Analytics to see which pages and
                experiments people actually use: pages visited, rough device
                and browser info, and approximate region. We do not store your
                IP address ourselves.
              </li>
              <li>
                <span className="font-medium text-text-primary">
                  Things you give an experiment.
                </span>{" "}
                Some experiments accept input, such as a listing URL or an
                uploaded image. That input is used to produce the result you
                asked for, and for nothing else.
              </li>
              <li>
                <span className="font-medium text-text-primary">
                  Purchases.
                </span>{" "}
                When an experiment sells something, checkout collects your name
                and email so we can deliver it. Payment is handled entirely by
                Stripe. We never see or store your card number.
              </li>
              <li>
                <span className="font-medium text-text-primary">Email.</span>{" "}
                If you buy something or ask for something by email, your
                address is used to deliver that thing. You will not be added to
                a marketing list unless you explicitly sign up for one.
              </li>
            </ul>
          </Section>

          <Section title="Signing in with Google">
            <P>
              Some experiments may offer &ldquo;Sign in with Google.&rdquo; If
              you use it, we receive your basic Google profile: your name,
              email address, and profile picture. We use that only to create
              and recognize your account within the experiment you signed in
              to.
            </P>
            <P>
              BHD Labs&rsquo; use of information received from Google APIs
              adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-accent-primary hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. We never use data
              received from Google to serve ads, and we never sell it.
            </P>
          </Section>

          <Section title="Services we rely on">
            <P>
              Running the site depends on a few providers, and each one sees
              only what it needs to do its job: Vercel hosts the site, Supabase
              stores experiment data, Stripe processes payments, Google
              provides analytics and sign-in, and some experiments send your
              input to OpenAI to generate text. None of them are given your
              data for their own marketing.
            </P>
          </Section>

          <Section title="Advertising measurement">
            <P>
              We sometimes advertise an experiment on Google. The Google tag on
              this site reports back to Google Ads whether a visit from one of
              those ads led anywhere, so we can tell if the ad was worth
              running. That measurement does not identify you to us, and we do
              not use your data to target ads at you.
            </P>
          </Section>

          <Section title="What we never do">
            <P>
              We never sell or rent your data, never share it with data
              brokers, and never use it to build advertising profiles. If an
              experiment ever needs something beyond what this page describes,
              this page changes first.
            </P>
          </Section>

          <Section title="Cookies">
            <P>
              The site sets analytics cookies from Google, and a session cookie
              if you sign in to a gated area. There are no third-party
              advertising cookies.
            </P>
          </Section>

          <Section title="Keeping and deleting data">
            <P>
              Data is kept only as long as it is needed to run the thing you
              used. Email{" "}
              <a
                href="mailto:katy@beckharrisdesign.com"
                className="text-accent-primary hover:underline"
              >
                katy@beckharrisdesign.com
              </a>{" "}
              to ask what we hold about you, or to have it deleted. The only
              exceptions are records we are legally required to keep, such as
              payment records.
            </P>
          </Section>

          <Section title="Changes to this policy">
            <P>
              If this policy changes, the new version appears here with an
              updated date at the top. Meaningful changes to what we collect
              will be called out plainly, not buried.
            </P>
          </Section>

          <Section title="See also">
            <P>
              The{" "}
              <Link
                href="/terms"
                className="text-accent-primary hover:underline"
              >
                terms of service
              </Link>{" "}
              cover the rules for using the site itself.
            </P>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
