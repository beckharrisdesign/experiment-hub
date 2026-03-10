import Link from "next/link";
import {
  Syne,
  Outfit,
  Plus_Jakarta_Sans,
  Sora,
  Instrument_Sans,
  Playfair_Display,
  Lora,
  Fraunces,
  DM_Serif_Display,
} from "next/font/google";
import Header from "@/components/Header";

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

const sansFonts = [
  { name: "Syne", className: syne.className, description: "Editorial, bold, distinctive. Slightly condensed with character." },
  { name: "Outfit", className: outfit.className, description: "Modern, warm, slightly rounded. Friendly but professional." },
  { name: "Plus Jakarta Sans", className: plusJakarta.className, description: "Clean and approachable. Product-style with a bit of flair." },
  { name: "Sora", className: sora.className, description: "Geometric, techy. Clear and contemporary." },
  { name: "Instrument Sans", className: instrumentSans.className, description: "Neutral with personality. Readable and distinctive." },
];

const serifFonts = [
  { name: "Playfair Display", className: playfair.className, description: "Classic editorial serif. Elegant, high contrast, authoritative." },
  { name: "Lora", className: lora.className, description: "Contemporary serif. Warm, readable, works at many sizes." },
  { name: "Fraunces", className: fraunces.className, description: "Soft, rounded serif with character. Friendly and distinctive." },
  { name: "DM Serif Display", className: dmSerifDisplay.className, description: "Bold display serif. Strong presence, editorial." },
];

export default function FontPreviewPage() {
  return (
    <div className="min-h-screen">
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
            className={`mb-16 rounded-lg border border-border bg-background-secondary p-8 ${font.className}`}
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
            className={`mb-16 rounded-lg border border-border bg-background-secondary p-8 ${font.className}`}
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
