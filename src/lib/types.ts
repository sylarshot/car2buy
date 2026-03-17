export type Fuel = "petrol" | "hybrid" | "plugin_hybrid" | "electric";

export type Transmission = "manual" | "automatic" | "cvt" | "other";

export type BodyType =
  | "hatchback"
  | "sedan"
  | "suv"
  | "coupe"
  | "convertible";

export type Listing = {
  id: string;
  title: string;
  make?: string;
  model?: string;
  imageUrl?: string; // local (/cars/xxx.svg) or remote https://...
  priceHuf: number;
  year: number;
  mileageKm: number;
  fuel: Fuel;
  transmission: Transmission;
  body: BodyType;
  location?: string;
  powerKw?: number;
  displacementCcm?: number;
  notes?: string;
  url?: string;
  createdAt?: string;
};

export type SearchCriteria = {
  query?: string;
  budgetHuf?: number;
  budgetFlexPct?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMaxKm?: number;
  fuels?: Fuel[];
  transmissions?: Transmission[];
  bodies?: BodyType[];
  locations?: string[];
};

export type ScoredListing = Listing & {
  score: number;
  reasons: string[];
};

