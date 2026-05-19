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
  description?: string; // Printed packet description/marketing copy
  plantingInstructions?: string; // Printed packet planting instruction text
  notes?: string;
  /** User-authored; distinct from packet-sourced `notes`. */
  myNotes?: string;
  /** Canonical field keys hidden for this seed in list/detail/edit. */
  hiddenFields?: string[];
  customFields?: SeedCustomFieldValue[];
  instructionAnnotations?: SeedInstructionAnnotation[];
  rawPacketText?: SeedRawPacketText[];
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

export type SeedFieldValueType =
  | 'short_text'
  | 'long_text'
  | 'integer'
  | 'date'
  | 'boolean'
  | 'single_select'
  | 'multi_select'
  | 'month_list'
  | 'photo_reference'
  | 'instruction_text';

export interface SeedCustomFieldValue {
  id?: string;
  definitionId?: string;
  label: string;
  valueType: SeedFieldValueType;
  value: string | number | boolean | number[];
  displayOrder?: number;
  hidden?: boolean;
}

export interface SeedInstructionAnnotation {
  id?: string;
  fieldKey: keyof Seed | string;
  label?: string;
  note: string;
  displayOrder?: number;
  updatedAt?: string;
}

export interface SeedRawPacketText {
  key: string;
  value: string;
  source?: 'front' | 'back';
}
