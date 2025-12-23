// Climate data for a specific zip code
export interface ClimateData {
  zipCode: string;
  averageFirstFrost: string; // Date format: "MM-DD" (e.g., "11-15")
  averageLastFrost: string; // Date format: "MM-DD" (e.g., "03-01")
  averageTemperatures: {
    january: number; // Average temperature in Fahrenheit
    february: number;
    march: number;
    april: number;
    may: number;
    june: number;
    july: number;
    august: number;
    september: number;
    october: number;
    november: number;
    december: number;
  };
  source?: string; // Data source (e.g., "NOAA", "USDA")
  lastUpdated?: string; // When this data was last updated
}

