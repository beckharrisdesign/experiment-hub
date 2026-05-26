"use client";

import { useState } from "react";
import { ViabilityBadge } from "@/components/ViabilityBadge";
import { SeedPill } from "@/components/SeedPill";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";

/**
 * Dev-only component preview surface.
 *
 * Renders priority SSO components in isolation with inline mock data, so the
 * design↔code parity loop can be exercised without booting the whole app.
 *
 * One section per component. Each section: heading · Figma node link ·
 * rendered variants with mock props. Mocks stay inline (colocated) until
 * volume justifies extraction — see design.md "Decisions".
 *
 * Add new components here as the parity convention extends. Components
 * already covered get a matching `Parity: full` row in
 * `experiments/simple-seed-organizer/docs/figma-source.md`.
 */
export function DevComponentsClient() {
  const currentYear = new Date().getFullYear();

  // SearchBar needs client state for its `value` / `onChange` contract.
  const [searchValue, setSearchValue] = useState("");

  // FilterBar needs client state for `activeType` / `onTypeChange`.
  const [activeFilter, setActiveFilter] = useState<
    "all" | "use-first" | "vegetable" | "herb" | "flower" | "fruit"
  >("all");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-12 text-[#0a0a0a]">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-gray-500">
          Dev surface · not signed in · NODE_ENV=development only
        </p>
        <h1 className="text-2xl font-semibold">SSO component preview</h1>
        <p className="text-sm text-gray-600">
          Priority components rendered in isolation for the figma-code parity
          loop. See{" "}
          <a
            className="underline"
            href="https://github.com/beckharrisdesign/experiment-hub/tree/main/openspec/changes/sso-design-code-loop"
          >
            openspec/changes/sso-design-code-loop
          </a>
          .
        </p>
      </header>

      <Section
        name="ViabilityBadge"
        figmaNode="(no node yet — first-proof component)"
        figmaUrl={null}
      >
        <Row label="status: use-first (old seed)">
          <ViabilityBadge year={currentYear - 6} cropName="tomato" />
        </Row>
        <Row label="status: watch (aging)">
          <ViabilityBadge year={currentYear - 3} cropName="tomato" />
        </Row>
        <Row label="status: good (renders null — expected)">
          <ViabilityBadge year={currentYear} cropName="tomato" />
          <span className="text-xs text-gray-500 ml-2">
            (no visible output)
          </span>
        </Row>
      </Section>

      <Section
        name="SeedPill"
        figmaNode="(see figma-source.md component table)"
        figmaUrl={null}
      >
        <Row label="variant: badge / tone: attention">
          <SeedPill as="span" variant="badge" tone="attention" size="sm">
            Use first
          </SeedPill>
        </Row>
        <Row label="variant: badge / tone: warning">
          <SeedPill as="span" variant="badge" tone="warning" size="sm">
            3 yrs
          </SeedPill>
        </Row>
        <Row label="variant: filter-plain">
          <SeedPill variant="filter-plain" onClick={() => {}}>
            Herbs
          </SeedPill>
        </Row>
        <Row label="variant: filter-selected">
          <SeedPill variant="filter-selected" onClick={() => {}}>
            Vegetables
          </SeedPill>
        </Row>
      </Section>

      <Section
        name="SearchBar"
        figmaNode="(see figma-source.md component table)"
        figmaUrl={null}
      >
        <Row label="empty / typing">
          <div className="w-full max-w-md">
            <SearchBar value={searchValue} onChange={setSearchValue} />
          </div>
        </Row>
      </Section>

      <Section
        name="FilterBar"
        figmaNode="(see figma-source.md component table)"
        figmaUrl={null}
      >
        <Row label={`active: ${activeFilter}`}>
          <div className="w-full max-w-md">
            <FilterBar
              activeType={activeFilter}
              onTypeChange={(t) => setActiveFilter(t as typeof activeFilter)}
            />
          </div>
        </Row>
      </Section>

      <Section
        name="SeedDetail"
        figmaNode="13:3 (desktop) / 98:1398 (mobile)"
        figmaUrl="https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=13-3"
      >
        <Row label="TODO">
          <p className="text-sm text-gray-600">
            Not yet wired into the preview — needs a seed mock + lib stubs.
            Tracked in figma-source.md.
          </p>
        </Row>
      </Section>
    </main>
  );
}

interface SectionProps {
  name: string;
  figmaNode: string;
  figmaUrl: string | null;
  children: React.ReactNode;
}

function Section({ name, figmaNode, figmaUrl, children }: SectionProps) {
  return (
    <section className="space-y-3 border-t border-gray-200 pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{name}</h2>
        <span className="text-xs text-gray-500 font-mono">
          {figmaUrl ? (
            <a
              href={figmaUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Figma: {figmaNode}
            </a>
          ) : (
            <>Figma: {figmaNode}</>
          )}
        </span>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <div className="flex items-center flex-wrap gap-3">{children}</div>
    </div>
  );
}
