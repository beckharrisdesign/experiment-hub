export interface LandingPageConfig {
  experimentSlug: string;
  experimentName: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  pricing?: {
    amount: number;
    period: 'month' | 'year' | 'one-time';
    earlyBirdDiscount?: number;
  };
  features: {
    title: string;
    description: string;
    icon?: string;
  }[];
  problems: {
    title: string;
    description: string;
    icon?: string;
  }[];
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
  };
  formFields?: FormField[];
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'multiselect' | 'radio';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string; emoji?: string }[];
}

export interface LandingPageSubmission {
  experimentSlug: string;
  experimentName: string;
  email: string;
  name?: string;
  formData: Record<string, any>;
  source?: string;
  timestamp: string;
}
