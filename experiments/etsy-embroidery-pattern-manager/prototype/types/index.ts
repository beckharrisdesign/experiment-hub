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
  status: 'idea' | 'in-progress' | 'ready' | 'listed';
  notes?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  style?: string;
  releaseId?: string;
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

// Listing Types
export interface Listing {
  id: string;
  patternId: string;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  price?: number;
  seoScore?: number;
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

