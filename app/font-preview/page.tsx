import Link from "next/link";
import Header from "@/components/Header";

/**
 * Candidate headline fonts, loaded at RUNTIME from Google rather than through
 * `next/font/google`.
 *
 * The Google loader downloads its files during `next build`, so these nine
 * families were nine chances for a third-party blip to fail the production
 * build — which is exactly what happened to d263f99 (#518), on a PR that
 * touched no fonts, with `Module not found: …/font/google/syne_….module.css`.
 * That now also blocks portfolio CSS from shipping, because
 * beckharrisdesign.com loads public/super/site.css off this same project.
 *
 * Nothing about a font-comparison page justifies that: it is an internal
 * design tool, not a shipped surface, and a `<link>` costs the build nothing.
 * If Google is down the page degrades to fallbacks instead of taking the deploy
 * with it. The fonts the hub actually ships are self-hosted in app/layout.tsx.
 *
 * Adding a candidate means adding it to GOOGLE_FONTS_HREF as well as the list.
 */
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Syne:wght@500;600;700" +
  "&family=Outfit:wght@500;600;700" +
  "&family=Plus+Jakarta+Sans:wght@500;600;700" +
  "&family=Sora:wght@500;600;700" +
  "&family=Instrument+Sans:wght@500;600;700" +
  "&family=Playfair+Display:wght@500;600;700" +
  "&family=Lora:wght@500;600;700" +
  "&family=DM+Serif+Display:wght@400" +
  "&display=swap";

const sansFonts = [
  { name: "Syne", stack: "'Syne', sans-serif", description: "Editorial, bold, distinctive. Slightly condensed with character." },
  { name: "Outfit", stack: "'Outfit', sans-serif", description: "Modern, warm, slightly rounded. Friendly but professional." },
  { name: "Plus Jakarta Sans", stack: "'Plus Jakarta Sans', sans-serif", description: "Clean and approachable. Product-style with a bit of flair." },
  { name: "Sora", stack: "'Sora', sans-serif", description: "Geometric, techy. Clear and contemporary." },
  { name: "Instrument Sans", stack: "'Instrument Sans', sans-serif", description: "Neutral with personality. Readable and distinctive." },
];

const serifFonts = [
  { name: "Playfair Display", stack: "'Playfair Display', serif", description: "Classic editorial serif. Elegant, high contrast, authoritative." },
  { name: "Lora", stack: "'Lora', serif", description: "Contemporary serif. Warm, readable, works at many sizes." },
  // The one the hub actually ships, so read it from the self-hosted file the
  // layout loads — comparing against a second copy from Google would be
  // comparing against a font no page serves.
  { name: "Fraunces (in use)", stack: "var(--font-fraunces), Georgia, serif", description: "Soft, rounded serif with character. Friendly and distinctive." },
  { name: "DM Serif Display", stack: "'DM Serif Display', serif", description: "Bold display serif. Strong presence, editorial." },
];

export default function FontPreviewPage() {
  return (
    <div className="min-h-screen">
      {/* React hoists this into <head>; `precedence` is what makes that supported
          rather than incidental. Runtime, so the build never waits on Google. */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={GOOGLE_FONTS_HREF} precedence="default" />
      {/* globals.css sets `h1..h6 { font-family: var(--font-fraunces) }` inside
          `@layer base`. A direct element rule beats inheritance, so every
          specimen below rendered its headings in Fraunces no matter which font
          the card was for — a headline preview that previewed one headline.
          An UNLAYERED rule outranks any layered one regardless of specificity,
          which is what makes this one line enough. The variation settings have
          to go back to normal too: "SOFT"/"WONK" are Fraunces axes and mean
          nothing to the other families. */}
      <style>{`
        [data-font-specimen] :is(h1, h2, h3, h4, h5, h6) {
          font-family: inherit;
          font-variation-settings: normal;
        }
      `}</style>
      <Header />
      <main className="mx-auto max-w-4xl px-8 py-10">
        <p className="mb-10 text-sm text-text-muted">
          <Link href="/" className="hover:text-accent-primary">← Back to hub</Link>
          {" · "}
          Headline font options in your hub colors. Body remains Inter.
        </p>

        <h2 className="mb-6 text-lg font-semibold uppercase tracking-wider text-text-muted">
          Sans
        </h2>
        {sansFonts.map((font) => (
          <section
            key={font.name}
            data-font-specimen
            className="mb-16 rounded-lg border border-border bg-background-secondary p-8"
            style={{ fontFamily: font.stack }}
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              {font.name}
            </p>
            <p className="mb-6 text-sm text-text-secondary">
              {font.description}
            </p>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold text-text-primary">
                BHD Labs
              </h1>
              <h2 className="text-2xl font-semibold text-text-primary">
                About the Hub
              </h2>
              <h3 className="text-xl font-semibold text-text-primary">
                Best Day Ever
              </h3>
              <p className="text-lg font-medium text-accent-primary">
                Experiment Scores
              </p>
              <p className="text-base text-text-secondary">
                Body text stays Inter — this font is for headings only.
              </p>
            </div>
          </section>
        ))}

        <h2 className="mb-6 mt-16 text-lg font-semibold uppercase tracking-wider text-text-muted">
          Serif
        </h2>
        {serifFonts.map((font) => (
          <section
            key={font.name}
            data-font-specimen
            className="mb-16 rounded-lg border border-border bg-background-secondary p-8"
            style={{ fontFamily: font.stack }}
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              {font.name}
            </p>
            <p className="mb-6 text-sm text-text-secondary">
              {font.description}
            </p>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold text-text-primary">
                BHD Labs
              </h1>
              <h2 className="text-2xl font-semibold text-text-primary">
                About the Hub
              </h2>
              <h3 className="text-xl font-semibold text-text-primary">
                Best Day Ever
              </h3>
              <p className="text-lg font-medium text-accent-primary">
                Experiment Scores
              </p>
              <p className="text-base text-text-secondary">
                Body text stays Inter — this font is for headings only.
              </p>
            </div>
          </section>
        ))}

        <p className="mt-6 text-sm text-text-muted">
          Pick one, then we can wire it into the layout and Tailwind as a headline utility.
        </p>
      </main>
    </div>
  );
}
