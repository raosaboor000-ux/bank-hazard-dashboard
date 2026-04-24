export type HazardKey =
  | "flood"
  | "heatwave"
  | "drought"
  | "urban_flood"
  | "extreme_rain";

export type Branch = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  asset_value: number;
  hazards: Record<HazardKey, number>;
  risk_scores: {
    baseline: number;
    short_term: number;
    medium_term: number;
    long_term: number;
  };
};
