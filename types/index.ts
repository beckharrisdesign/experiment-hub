export type ExperimentStatus = "Active" | "Completed" | "Abandoned" | "On Hold";
export type PrototypeStatus = "Active" | "Completed" | "Abandoned";

export interface ExperimentScores {
  businessOpportunity: number; // 1-5: Market potential and revenue opportunity
  personalImpact: number; // 1-5: Would I personally use/benefit from this?
  competitiveAdvantage: number; // 1-5: Low competition = 5, High competition = 1
  platformCost: number; // 1-5: Low cost/easy = 5, High cost/complex = 1
  socialImpact: number; // 1-5: Fun, joy, and whether the world needs this
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

