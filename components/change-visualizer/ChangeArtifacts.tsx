import Link from "next/link";
import type { ArtifactLink } from "@/lib/change-visualizer/artifacts";

const GROUP_LABEL: Record<ArtifactLink["group"], string> = {
  hub: "On the hub",
  change: "The change",
  design: "Committed renders",
};

const GROUP_ORDER: ArtifactLink["group"][] = ["hub", "change", "design"];

/**
 * Artifacts for a linked OpenSpec change. Renders nothing when there are none,
 * matching the detail page's habit of dropping empty bands rather than showing
 * a hollow heading.
 */
export default function ChangeArtifacts({ links }: { links: ArtifactLink[] }) {
  if (links.length === 0) return null;

  return (
    <section aria-labelledby="artifacts" className="flex flex-col gap-4">
      <h2
        id="artifacts"
        className="font-mono text-[13px] tracking-[0.09em] text-text-dark-secondary"
      >
        ARTIFACTS
      </h2>
      <div className="flex flex-col gap-6">
        {GROUP_ORDER.map((group) => {
          const inGroup = links.filter((l) => l.group === group);
          if (inGroup.length === 0) return null;
          return (
            <div key={group} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-text-dark-secondary">
                {GROUP_LABEL[group]}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {inGroup.map((link) => (
                  <li key={link.href} className="text-[15px]">
                    {link.href.startsWith("/") ? (
                      <Link
                        href={link.href}
                        className="text-text-dark underline underline-offset-4 hover:text-accent-secondary"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-text-dark underline underline-offset-4 hover:text-accent-secondary"
                      >
                        {link.label}
                      </a>
                    )}
                    {link.detail && (
                      <span className="text-text-dark-secondary"> — {link.detail}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
