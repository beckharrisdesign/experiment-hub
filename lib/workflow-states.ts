/**
 * Canonical workflow state definitions.
 * Used by the workflow page for display and by tests to verify cell rendering stays in sync.
 *
 * The workflow follows a strict sequential order:
 *   New Experiment → Market Validation → PRD → Landing Page → Prototype
 */

export interface WorkflowState {
  state: string;
  condition: string;
  hasMRFile: boolean;
  hasPRDFile: boolean;
  hasLandingPage: boolean;
  hasPrototypeDir: boolean;
  description: string;
  scores: {
    businessOpportunity: number;
    personalImpact: number;
    competitiveAdvantage: number;
    platformCost: number;
    socialImpact: number;
  } | null;
}

export const WORKFLOW_STATES: WorkflowState[] = [
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
    description:
      "Prototype exists. Can view PRD, landing page, and work with the prototype (start/stop server).",
    scores: {
      businessOpportunity: 4,
      personalImpact: 5,
      competitiveAdvantage: 3,
      platformCost: 4,
      socialImpact: 5,
    },
  },
];
