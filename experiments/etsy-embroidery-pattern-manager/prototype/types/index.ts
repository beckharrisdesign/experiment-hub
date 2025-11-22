// Brand Identity Types
export interface BrandIdentity {
  id: string;
  storeName: string;
  brandTone: 'friendly' | 'professional' | 'whimsical' | 'minimalist' | 'vintage' | 'modern';
  creativeDirection: {
    visualStyle: 'modern' | 'vintage' | 'botanical' | 'geometric' | 'minimalist' | 'rustic';
    colorPalette: string[];
    typography?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Pattern Types
export interface Pattern {
  id: string;
  name: string;
  notes?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  style?: string;
  releaseId?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Release {
  id: string;
  name: string;
  releaseDate?: string;
  patternIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Template Types (templates that can be applied to one or more patterns)
// Examples:
// - Single digital listing (1 pattern)
// - Single embroidery kit (1 pattern)
// - Bundle of 3 digital patterns (3 patterns)
// - Custom bundle (N patterns)
export type TemplateType = 'digital' | 'physical';

export interface Template {
  id: string;
  name: string; // Template name (e.g., "Digital PDF Listing", "Embroidery Kit", "3-Pattern Bundle")
  types: TemplateType[]; // Can have multiple types
  numberOfItems: 'single' | 'three' | 'five'; // Number of items in the bundle
  patternIds: string[]; // Can be 0, 1, or many patterns
  title?: string; // Reserved for future use
  commonInstructions?: string; // Common instructions that apply to all listings using this template
  seoScore?: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Listing Types - A listing = Product Template + Pattern(s)
// The listing combines details from both the template and pattern(s)
// The listing stores references back to both the template and pattern objects
export interface Listing {
  id: string;
  templateId: string; // Backward reference to template
  patternIds: string[]; // Backward references to pattern objects (via listing_patterns junction table)
  
  // Basic Information
  title: string; // Max 140 characters
  description: string;
  
  // Media
  photos?: string[]; // Up to 20 photos/videos
  digitalFiles?: string[]; // Up to 5 digital files
  digitalNote?: string; // Note to buyers for digital items
  
  // Personalization
  offerPersonalization?: boolean;
  personalizationOptions?: string[];
  
  // Price & Inventory
  price?: number;
  quantity?: number;
  sku?: string;
  
  // Details
  category?: string; // Etsy category path
  attributes?: {
    craftType?: string[]; // Required for patterns
    occasion?: string[];
    holiday?: string[];
    [key: string]: string[] | undefined; // Other attributes
  };
  tags?: string[]; // Up to 13 tags
  materials?: string[];
  
  // Processing & Shipping
  processingTime?: string; // For digital: "Instant download"
  shippingProfileId?: string;
  
  // Settings
  returnsAccepted?: boolean;
  shopSectionId?: string;
  featured?: boolean;
  renewalOption?: 'automatic' | 'manual';
  
  // SEO & Analytics
  seoScore?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Customer Communication Types
export interface CustomerMessage {
  id: string;
  type: 'order-confirmation' | 'download-delivery' | 'follow-up' | 'question-response';
  content: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

// Image Generation Types
export interface ImageSpec {
  type: 'store-asset' | 'listing-image' | 'product-image' | 'customer-download';
  width: number;
  height: number;
  format: 'jpg' | 'png' | 'pdf' | 'svg';
  resolution?: number;
}

export interface GeneratedImage {
  id: string;
  patternId?: string;
  type: ImageSpec['type'];
  filePath: string;
  spec: ImageSpec;
  createdAt: string;
}

// SEO Types
export interface Keyword {
  keyword: string;
  relevance: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface SEOAnalysis {
  score: number;
  keywords: Keyword[];
  suggestions: string[];
  titleLength: number;
  tagCount: number;
}

// Export Types
export interface ExportPackage {
  listingId: string;
  text: {
    title: string;
    description: string;
    tags: string[];
    category?: string;
    price?: number;
  };
  images: {
    storeAssets?: string[];
    listingImages?: string[];
    productImages?: string[];
    customerDownloads?: string[];
  };
  communication?: {
    orderConfirmation?: string;
    downloadDelivery?: string;
    followUp?: string;
    questionResponses?: Record<string, string>;
  };
}

