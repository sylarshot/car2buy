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
  priceHuf: number;
  year: number;
  mileageKm: number;
  fuel: Fuel;
  transmission: Transmission;
  body: BodyType;
  location?: string; // e.g. "Budapest" / "Pest" / "Győr-Moson-Sopron"
  powerKw?: number;
  displacementCcm?: number;
  notes?: string;
  url?: string;
  imageUrl?: string; // local (/cars/xxx.svg) or remote https://...
  createdAt?: string; // ISO, optional
};

export type SearchCriteria = {
  query?: string; // free text (make/model/keywords)
  budgetHuf?: number;
  budgetFlexPct?: number; // how much above budget is acceptable (soft)
  yearMin?: number;
  yearMax?: number;
  mileageMaxKm?: number;
  fuels?: Fuel[];
  transmissions?: Transmission[];
  bodies?: BodyType[];
  locations?: string[]; // string contains match
};

export type ScoredListing = Listing & {
  score: number; // 0..100
  reasons: string[]; // short explanations
};

