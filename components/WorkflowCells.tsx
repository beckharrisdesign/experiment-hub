import Button from "@/components/Button";
import type { ValidationLandingPage } from "@/types";

// --- PRD Column Cell ---

interface PRDCellProps {
  hasMRFile: boolean;
  hasPRDFile: boolean;
  href: string;
}

export function PRDCell({ hasMRFile, hasPRDFile, href }: PRDCellProps) {
  if (!hasMRFile) return null;
  if (!hasPRDFile) {
    return (
      <Button as="link" variant="secondary" size="md" href={href} title="Create PRD">
        Create
      </Button>
    );
  }
  return (
    <Button as="link" variant="primary" size="md" href={href} title="View PRD">
      View
    </Button>
  );
}

// --- Landing Page Column Cell ---

interface LandingPageCellProps {
  hasPRDFile: boolean;
  hasLandingPage: boolean;
  /** When true and no landing page, show — instead of Plan (PRD + prototype but no landing) */
  hasPrototypeDir?: boolean;
  validation?: ValidationLandingPage;
  /** href used for Plan/Create action (and fallback for Live) */
  planHref: string;
  /** href used when the landing page file exists */
  viewHref: string;
  /** open viewHref in a new tab (e.g. when it points to a static HTML file) */
  viewExternal?: boolean;
}

export function LandingPageCell({
  hasPRDFile,
  hasLandingPage,
  hasPrototypeDir = false,
  validation,
  planHref,
  viewHref,
  viewExternal = false,
}: LandingPageCellProps) {
  if (!hasPRDFile) return null;

  if (hasLandingPage) {
    if (viewExternal) {
      return (
        <Button as="a" variant="primary" size="md" href={viewHref} target="_blank" title="View Landing Page">
          View
        </Button>
      );
    }
    return (
      <Button as="link" variant="primary" size="md" href={viewHref} title="View Landing Page">
        View
      </Button>
    );
  }

  const validationStatus = validation?.status ?? "not_started";
  switch (validationStatus) {
    case "planned":
      return <span className="text-sm text-warning font-medium">Planned</span>;
    case "live":
      return (
        <Button as="link" variant="primary" size="md" href={validation?.url || planHref} title="View Live Landing Page">
          Live
        </Button>
      );
    case "complete":
      return <span className="text-sm text-success font-medium">Complete</span>;
    default: // not_started
      if (hasPrototypeDir) {
        return <span className="text-sm text-text-muted">—</span>;
      }
      return (
        <Button as="link" variant="secondary" size="md" href={planHref} title="Plan Landing Page">
          Plan
        </Button>
      );
  }
}
