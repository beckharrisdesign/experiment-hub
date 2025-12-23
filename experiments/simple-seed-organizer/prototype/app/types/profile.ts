export interface UserProfile {
  zipCode?: string;
  growingZone?: string; // e.g., "8a", "9b", "7" - based on 2024 USDA map
  previousZone?: string; // Previous zone if it changed (e.g., "8a" -> "9a")
  location?: string; // City, State (optional)
  updatedAt: string;
}

