"use client";

/** @figma S8YJQugvMmn5jaRqwFM5XO:80:1268 */
export function LandingFooter() {
  return (
    <footer className="px-4 py-8 bg-gray-800 text-gray-400">
      <div className="max-w-[1200px] mx-auto text-center">
        <p className="mb-4">
          © 2026 Simple Seed Organizer. All rights reserved.
        </p>
        <div className="flex justify-center gap-6 text-sm">
          <a href="/privacy" className="hover:text-[#86efac] transition-colors">
            Privacy Policy
          </a>
          <a href="/terms" className="hover:text-[#86efac] transition-colors">
            Terms of Service
          </a>
          <a
            href="mailto:katy@beckharrisdesign.com"
            className="hover:text-[#86efac] transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
