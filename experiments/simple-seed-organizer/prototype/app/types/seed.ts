export interface Seed {
  id: string;
  user_id?: string;
  name: string;
  variety: string;
  type: 'vegetable' | 'herb' | 'flower' | 'fruit' | 'other';
  brand?: string;
  source?: string; // Where purchased (retailer/store)
  year?: number;
  purchaseDate?: string; // ISO date string (YYYY-MM-DD)
  quantity?: string;
  daysToGermination?: string;
  daysToMaturity?: string;
  plantingDepth?: string; // e.g., "1/4 inch" or "0.5"
  spacing?: string; // e.g., "12 inches" or "12-18"
  sunRequirement?: 'full-sun' | 'partial-shade' | 'full-shade';
  plantingMonths?: number[]; // 1-12
  notes?: string;
  photoFront?: string; // URL (from storage) or legacy base64 data URL
  photoBack?: string;
  photoFrontPath?: string; // storage path (for save/update)
  photoBackPath?: string;
  useFirst?: boolean;
  customExpirationDate?: string; // ISO date string (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
}

export type SeedType = Seed['type'];
export type SunRequirement = Seed['sunRequirement'];

export type ViewMode = 'type' | 'month' | 'age' | 'photo';
