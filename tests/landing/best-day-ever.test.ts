/**
 * Best Day Ever landing page — assertions against Figma "ready for development" frame (node 3:1051).
 * Run with: npm test -- tests/landing/best-day-ever.test.ts
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";

const LANDING_HTML_PATH = path.join(
  process.cwd(),
  "experiments/best-day-ever/landing/index.html",
);

function loadLandingDOM(): Document {
  const html = fs.readFileSync(LANDING_HTML_PATH, "utf-8");
  const { window } = new JSDOM(html);
  return window.document;
}

function hasText(doc: Document, text: string): boolean {
  return doc.body?.textContent?.includes(text) ?? false;
}

describe("Best Day Ever landing page (Figma ready for development)", () => {
  const doc = loadLandingDOM();

  describe("hero section", () => {
    it("has headline: Make every day your + best day ever", () => {
      expect(hasText(doc, "Make every day your")).toBe(true);
      expect(hasText(doc, "best day ever")).toBe(true);
    });

    it("has hero tagline from Figma", () => {
      expect(
        hasText(
          doc,
          "Transform your daily routine into extraordinary experiences. Start living your best life today",
        ),
      ).toBe(true);
    });

    it("has primary CTA: Get early access", () => {
      expect(hasText(doc, "Get early access")).toBe(true);
    });

    it("has link to how it works", () => {
      expect(hasText(doc, "How it works")).toBe(true);
    });

    it("highlights 'best day ever' (pink accent from Figma)", () => {
      const span = doc.querySelector(
        'h1 span[class*="pink"], h1 span.bg-bde-pink',
      );
      expect(span).toBeTruthy();
      expect((span?.textContent || "").toLowerCase()).toContain(
        "best day ever",
      );
    });

    it("has decorative shapes", () => {
      expect(doc.querySelectorAll(".shape, svg").length).toBeGreaterThan(0);
    });
  });

  describe("From calendar to paper in 60 seconds", () => {
    it("has section headline with 60 seconds", () => {
      expect(hasText(doc, "From calendar to paper in 60 seconds")).toBe(true);
    });

    it("has subhead from Figma", () => {
      expect(
        hasText(
          doc,
          "No manual copying. No tedious setup. Just your schedule, ready to hold",
        ),
      ).toBe(true);
    });

    it("has Connect your calendar, Choose your template, Print and get to work", () => {
      expect(hasText(doc, "Connect your calendar")).toBe(true);
      expect(hasText(doc, "Choose your template")).toBe(true);
      expect(hasText(doc, "Print and get to work")).toBe(true);
    });

    it("has Connect your calendar description", () => {
      expect(
        hasText(
          doc,
          "One-time setup with Google Calendar. We pull your events, never write to them",
        ),
      ).toBe(true);
    });

    it("has Choose your template description", () => {
      expect(hasText(doc, "Pick from layouts designed for ADHD brains")).toBe(
        true,
      );
    });

    it("has Print and get to work description", () => {
      expect(
        hasText(
          doc,
          "Your plan is ready in under 60 seconds. Write on it, check it off, make it yours",
        ),
      ).toBe(true);
    });
  });

  describe("Why physical planning works", () => {
    it("has section headline", () => {
      expect(hasText(doc, "Why physical planning works")).toBe(true);
    });

    it("has subhead from Figma", () => {
      expect(
        hasText(
          doc,
          "Many ADHD brains respond better to tactile, physical objects.",
        ),
      ).toBe(true);
    });

    it("has Write by hand, Feel the ritual, Physical artifact", () => {
      expect(hasText(doc, "Write by hand")).toBe(true);
      expect(hasText(doc, "Feel the ritual")).toBe(true);
      expect(hasText(doc, "Physical artifact")).toBe(true);
    });

    it("has Write by hand description", () => {
      expect(
        hasText(
          doc,
          "The physical act of writing engages motor memory and strengthens commitment",
        ),
      ).toBe(true);
    });

    it("has Feel the ritual description", () => {
      expect(
        hasText(
          doc,
          "Paper, pens, markers create sensory anchors that help you transition into work mode",
        ),
      ).toBe(true);
    });

    it("has Physical artifact description", () => {
      expect(
        hasText(
          doc,
          "A printed plan on your desk is harder to ignore than a browser tab",
        ),
      ).toBe(true);
    });
  });

  describe("Templates designed for ADHD", () => {
    it("has section headline", () => {
      expect(hasText(doc, "Templates designed for ADHD")).toBe(true);
    });

    it("has subhead from Figma", () => {
      expect(
        hasText(
          doc,
          "High contrast. Generous whitespace. Room to write, doodle, and check things off",
        ),
      ).toBe(true);
    });

    it("has Time Block, Top 3 + Schedule, Week at a Glance", () => {
      expect(hasText(doc, "Time Block")).toBe(true);
      expect(hasText(doc, "Top 3 + Schedule")).toBe(true);
      expect(hasText(doc, "Week at a Glance")).toBe(true);
    });

    it("has Time Block description", () => {
      expect(
        hasText(
          doc,
          "Hour-by-hour layout with your calendar events pre-filled",
        ),
      ).toBe(true);
    });

    it("has Top 3 + Schedule description", () => {
      expect(
        hasText(
          doc,
          "Three big boxes for your most important things (handwritten). Your calendar events below",
        ),
      ).toBe(true);
    });

    it("has Week at a Glance description", () => {
      expect(
        hasText(
          doc,
          "Seven columns, one per day. For Sunday planning sessions with markers and highlighters",
        ),
      ).toBe(true);
    });
  });

  describe("CTA section", () => {
    it("has headline: Ready to start your best day ever?", () => {
      expect(hasText(doc, "Ready to start your best day ever?")).toBe(true);
    });

    it("has CTA copy (validation phase)", () => {
      expect(hasText(doc, "Best Day Ever is in development")).toBe(true);
      expect(hasText(doc, "Join the list")).toBe(true);
    });

    it("has interest form with Join the list (validation phase, no trial/demo buttons)", () => {
      expect(hasText(doc, "Join the list")).toBe(true);
      expect(doc.getElementById("waitlist-form")).toBeTruthy();
    });
  });

  describe("footer", () => {
    it("has Product: Features, Pricing, FAQ", () => {
      expect(hasText(doc, "Features")).toBe(true);
      expect(hasText(doc, "Pricing")).toBe(true);
      expect(hasText(doc, "FAQ")).toBe(true);
    });

    it("has Company: About, Blog, Careers", () => {
      expect(hasText(doc, "About")).toBe(true);
      expect(hasText(doc, "Blog")).toBe(true);
      expect(hasText(doc, "Careers")).toBe(true);
    });

    it("has Legal: Privacy, Terms", () => {
      expect(hasText(doc, "Privacy")).toBe(true);
      expect(hasText(doc, "Terms")).toBe(true);
    });

    it("has © 2026 Best Day Ever", () => {
      expect(hasText(doc, "© 2026 Best Day Ever")).toBe(true);
    });
  });

  describe("page structure", () => {
    it("has max-width 992 layout", () => {
      expect(
        doc.documentElement.outerHTML.includes("992") ||
          doc.querySelector("[class*='max-w']") !== null,
      ).toBe(true);
    });

    it("follows section order: Hero, How, Why, Templates, CTA+form, Footer", () => {
      const bodyText = doc.body?.innerHTML ?? "";
      const heroPos = bodyText.indexOf('id="hero"');
      const howPos = bodyText.indexOf('id="how"');
      const physicalPos = bodyText.indexOf('id="physical"');
      const templatesPos = bodyText.indexOf('id="templates"');
      const formSectionPos = bodyText.indexOf('id="interest-form"');
      const ctaMarker = bodyText.indexOf("Ready to start your best day ever?");
      const footerMarker = bodyText.indexOf("© 2026 Best Day Ever");
      expect(heroPos).toBeGreaterThan(-1);
      expect(howPos).toBeGreaterThan(heroPos);
      expect(physicalPos).toBeGreaterThan(howPos);
      expect(templatesPos).toBeGreaterThan(physicalPos);
      expect(formSectionPos).toBeGreaterThan(templatesPos);
      expect(ctaMarker).toBeGreaterThan(-1);
      expect(footerMarker).toBeGreaterThan(formSectionPos);
    });

    it("uses inline SVGs for shapes and icons (no localhost image dependencies)", () => {
      // All decorative shapes and functional icons are inline SVGs — no external URLs
      const svgs = doc.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
      // Confirm no localhost:3845 image references leaked in (Figma Desktop MCP guard)
      const localhostImgs = doc.querySelectorAll('img[src*="localhost:"]');
      expect(localhostImgs.length).toBe(0);
    });

    it("has interest form for early access", () => {
      expect(doc.getElementById("waitlist-form")).toBeTruthy();
      expect(doc.getElementById("email")).toBeTruthy();
    });
  });
});
