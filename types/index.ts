export type ExperimentStatus = "Active" | "Completed" | "Abandoned" | "On Hold";
export type PrototypeStatus = "Active" | "Completed" | "Abandoned";
export type ValidationStatus = "not_started" | "planned" | "live" | "complete";

export interface ExperimentScores {
  businessOpportunity: number; // 1-5: Market potential and revenue opportunity (see agents/scoring-criteria.md)
  personalImpact: number; // 1-5: Would I personally use/benefit from this? (see agents/scoring-criteria.md)
  competitiveAdvantage: number; // 1-5: Market competition and differentiation (see agents/scoring-criteria.md)
  platformCost: number; // 1-5: Solo buildability with AI tools (Cursor) + infrastructure complexity (see agents/scoring-criteria.md)
  socialImpact: number; // 1-5: Fun, joy, and whether the world needs this (see agents/scoring-criteria.md)
}

export interface ValidationLandingPage {
  status: ValidationStatus;
  url?: string; // URL to the landing page
  notionPageId?: string; // Link to Notion page with validation results
}

export interface Experiment {
  id: string;
  name: string; // Short name/title of the experiment
  statement: string; // Full experiment statement
  directory: string;
  documentationId: string;
  prototypeId: string;
  status: ExperimentStatus;
  createdDate: string;
  lastModified: string;
  tags: string[];
  scores?: ExperimentScores; // Optional scoring (1-5 for each dimension)
  validation?: ValidationLandingPage; // Landing page validation status
}

export interface Prototype {
  id: string;
  title: string;
  description: string;
  linkPath: string;
  experimentId: string;
  status: PrototypeStatus;
  createdDate: string;
  lastModified: string;
  tags: string[];
  port?: number; // Port number for running prototype (e.g., 3001, 3002)
}

export interface Documentation {
  id: string;
  title: string;
  content: string;
  experimentId: string;
  createdDate: string;
  lastModified: string;
  tags: string[];
}

export type ContentType = "experiments" | "prototypes" | "documentation";

