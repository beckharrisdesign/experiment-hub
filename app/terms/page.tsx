import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — BHD Labs",
  description:
    "The rules for using BHD Labs, in plain language: everything here is an experiment.",
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

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background-primary">
      <Header />
      <main className="flex-1 px-4 py-10 md:px-8 lg:px-16">
        <div className="mx-auto flex max-w-screen-md flex-col gap-10">
          <header className="flex flex-col gap-3">
            <h1 className="font-heading text-3xl font-semibold text-text-primary lg:text-4xl">
              Terms of service
            </h1>
            <p className="text-sm text-text-muted">
              Last updated {LAST_UPDATED}
            </p>
          </header>

          <Section title="The short version">
            <P>
              Everything on this site is an experiment. Use it in good faith,
              and if you pay for something and it does not work, email and we
              will make it right.
            </P>
          </Section>

          <Section title="What BHD Labs is">
            <P>
              BHD Labs (labs.beckharrisdesign.com) is a hub of product
              experiments run by Beck Harris Design, a one-person design
              studio. Experiments are exactly that: they may change, break,
              pause, or be retired at any time, sometimes without notice. By
              using the site you accept these terms.
            </P>
          </Section>

          <Section title="Using the site">
            <P>
              Use the site lawfully and in good faith. Do not probe or break
              its security, do not try to access other people&rsquo;s data,
              and do not scrape or overload it. If an experiment lets you sign
              in, keep your account credentials to yourself and give accurate
              information.
            </P>
          </Section>

          <Section title="Paid products">
            <P>
              Some experiments charge money. The price and what you get are
              stated before you pay. If what you receive is broken or not what
              was described, email{" "}
              <a
                href="mailto:katy@beckharrisdesign.com"
                className="text-accent-primary hover:underline"
              >
                katy@beckharrisdesign.com
              </a>{" "}
              within 30 days and we will fix it or refund you.
            </P>
          </Section>

          <Section title="Your content">
            <P>
              Anything you submit to an experiment stays yours. By submitting
              it you give us permission to process it as needed to produce the
              result you asked for, and nothing more. We claim no ownership of
              your content.
            </P>
          </Section>

          <Section title="Our content">
            <P>
              The site itself, including its design, code, and text, belongs
              to Beck Harris Design unless marked otherwise. You are welcome to
              link to anything here.
            </P>
          </Section>

          <Section title="No warranty">
            <P>
              The site and its experiments are provided as is, without
              warranties of any kind. Experiments are by definition
              unfinished. We do not guarantee availability, accuracy, or
              fitness for any purpose. Keep your own copies of anything you
              care about.
            </P>
          </Section>

          <Section title="Limitation of liability">
            <P>
              To the fullest extent the law allows, our total liability for
              any claim arising from your use of the site is limited to the
              amount you paid us in the twelve months before the claim.
            </P>
          </Section>

          <Section title="Ending access">
            <P>
              We may suspend or close access for anyone who abuses the site or
              breaks these terms. You can stop using the site at any time, and
              you can email to have an account and its data deleted.
            </P>
          </Section>

          <Section title="Changes to these terms">
            <P>
              If these terms change, the new version appears here with an
              updated date at the top. Continuing to use the site after a
              change means you accept the new terms.
            </P>
          </Section>

          <Section title="See also">
            <P>
              The{" "}
              <Link
                href="/policy"
                className="text-accent-primary hover:underline"
              >
                privacy policy
              </Link>{" "}
              covers what we collect and what happens to it.
            </P>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
