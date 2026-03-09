import Header from "@/components/Header";
import Button from "@/components/Button";
import ScoreDisplay from "@/components/ScoreDisplay";
import { PRDCell, LandingPageCell } from "@/components/WorkflowCells";

export default function WorkflowPage() {
  const states = [
    {
      state: "New Experiment",
      condition: "hasMRFile = false",
      hasMRFile: false,
      hasPRDFile: false,
      hasLandingPage: false,
      hasPrototypeDir: false,
      description: "Experiment is brand new. Only Market Validation step is available.",
      scores: null,
    },
    {
      state: "Market Validation",
      condition: "hasMRFile = true, hasPRDFile = false",
      hasMRFile: true,
      hasPRDFile: false,
      hasLandingPage: false,
      hasPrototypeDir: false,
      description: "Market Research & Scoring is complete. PRD creation is now available.",
      scores: {
        businessOpportunity: 4,
        personalImpact: 5,
        competitiveAdvantage: 3,
        platformCost: 4,
        socialImpact: 5,
      },
    },
    {
      state: "PRD",
      condition: "hasPRDFile = true, hasLandingPage = false",
      hasMRFile: true,
      hasPRDFile: true,
      hasLandingPage: false,
      hasPrototypeDir: false,
      description: "PRD exists. Landing page planning and prototype creation are now available.",
      scores: {
        businessOpportunity: 4,
        personalImpact: 5,
        competitiveAdvantage: 3,
        platformCost: 4,
        socialImpact: 5,
      },
    },
    {
      state: "Landing Page",
      condition: "hasPRDFile = true, hasLandingPage = true, hasPrototypeDir = false",
      hasMRFile: true,
      hasPRDFile: true,
      hasLandingPage: true,
      hasPrototypeDir: false,
      description: "Landing page built. Can view it and create a prototype.",
      scores: {
        businessOpportunity: 4,
        personalImpact: 5,
        competitiveAdvantage: 3,
        platformCost: 4,
        socialImpact: 5,
      },
    },
    {
      state: "Prototype",
      condition: "hasPRDFile = true, hasLandingPage = true, hasPrototypeDir = true",
      hasMRFile: true,
      hasPRDFile: true,
      hasLandingPage: true,
      hasPrototypeDir: true,
      description: "Prototype exists. Can view PRD, landing page, and work with the prototype (start/stop server).",
      scores: {
        businessOpportunity: 4,
        personalImpact: 5,
        competitiveAdvantage: 3,
        platformCost: 4,
        socialImpact: 5,
      },
    },
  ];

  const renderMarketValidationColumn = (state: typeof states[0]) => {
    if (!state.hasMRFile) {
      return (
        <Button
          as="link"
          variant="secondary"
          href="#market-research"
          title="Create Market Validation"
        >
          Create
        </Button>
      );
    }
    return <ScoreDisplay scores={state.scores} />;
  };

  const renderPrototypeColumn = (state: typeof states[0]) => {
    if (!state.hasPRDFile) {
      return null;
    }
    if (!state.hasPrototypeDir) {
      return (
        <Button
          as="link"
          variant="secondary"
          href="#"
          title="Create Prototype"
        >
          Create
        </Button>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <Button
          as="a"
          variant="primary"
          href="http://localhost:3001"
          target="_blank"
          rel="noopener noreferrer"
          title="View prototype"
        >
          View
        </Button>
        <Button
          variant="destructive"
          title="Stop server"
        >
          Stop
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-semibold text-text-primary mb-2">Workflow State Machine</h1>
          <p className="text-text-secondary mb-8">
            Overview of the experiment workflow states and their criteria. The workflow follows a strict order: <strong>Market Validation → PRD → Landing Page → Prototype</strong>
          </p>

          <div className="rounded-lg border border-border bg-background-secondary overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background-tertiary">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap">State</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap">Condition</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap">Market Validation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap">PRD</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap">Landing Page</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap">Prototype</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary whitespace-nowrap">Description</th>
                </tr>
              </thead>
              <tbody>
                {states.map((state, index) => (
                  <tr
                    key={index}
                    className="border-b border-border transition-colors hover:bg-background-tertiary"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">{state.state}</span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-background-tertiary px-2 py-1 rounded text-text-secondary">
                        {state.condition}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {renderMarketValidationColumn(state) || <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {state.hasMRFile
                        ? <PRDCell hasMRFile={state.hasMRFile} hasPRDFile={state.hasPRDFile} href="#prd" />
                        : <span className="text-text-muted">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {state.hasPRDFile
                        ? <LandingPageCell hasPRDFile={state.hasPRDFile} hasLandingPage={state.hasLandingPage} planHref="#landing" viewHref="#landing" />
                        : <span className="text-text-muted">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {renderPrototypeColumn(state) || <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {state.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-background-secondary p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Workflow Rules</h2>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-accent-primary mt-0.5">•</span>
                <span>Only the <strong>next step</strong> in the workflow is available</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-primary mt-0.5">•</span>
                <span>Landing Page and Prototype actions only appear after PRD is complete</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-primary mt-0.5">•</span>
                <span>Steps cannot be skipped - must complete in order</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-primary mt-0.5">•</span>
                <span>Market Validation includes both Market Research and Scoring (B, P, C, $, S)</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
