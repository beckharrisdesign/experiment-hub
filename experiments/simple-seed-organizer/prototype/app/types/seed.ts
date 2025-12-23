export interface Seed {
  id: string;
  name: string;
  variety: string;
  type: 'vegetable' | 'herb' | 'flower' | 'fruit' | 'other';
  brand?: string;
  year?: number;
  quantity?: string;
  daysToGermination?: string;
  daysToMaturity?: string;
  sunRequirement?: 'full-sun' | 'partial-shade' | 'full-shade';
  plantingMonths?: number[]; // 1-12
  notes?: string;
  photoFront?: string; // base64 or URL
  photoBack?: string;
  useFirst?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SeedType = Seed['type'];
export type SunRequirement = Seed['sunRequirement'];

export type ViewMode = 'type' | 'month' | 'age' | 'photo';
