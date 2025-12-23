// USDA Hardiness Zone data structure
export interface HardinessZone {
  zone: string; // e.g., "9a", "9b", "9c", or "9" for general
  minTempF: number; // Minimum average annual temperature in Fahrenheit
  maxTempF: number; // Maximum average annual temperature in Fahrenheit
  minTempC: number; // Minimum average annual temperature in Celsius
  maxTempC: number; // Maximum average annual temperature in Celsius
  description: string; // Human-readable description
}

export interface ZoneLookup {
  zipCode: string;
  zone2024: string; // Current zone based on 2024 USDA map
  zone2012?: string; // Previous zone from 2012 map (if changed)
  location?: string; // City, State
  state?: string;
}

