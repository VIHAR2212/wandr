export interface TripFormData {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  purposes: string[];        // Changed: multiple purposes
  foodPreference: string;
  hotelPreference: string;
  transportPreferences: string[];
  specialRequests: string;
  includeHiddenGems: boolean;
  flexibleBudget: boolean;
  smartBudget: boolean;     // NEW: "Good for trip" auto-select
}

export type TripPurpose =
  | 'ADVENTURE'
  | 'DEVOTIONAL'
  | 'HIKING'
  | 'HONEYMOON'
  | 'FAMILY'
  | 'PHOTOGRAPHY'
  | 'BUSINESS'
  | 'FOOD_EXPLORATION'
  | 'WELLNESS'
  | 'CULTURAL'
  | 'SOLO'
  | 'BACKPACKING';

export type FoodPreference =
  | 'VEG'
  | 'JAIN'
  | 'VEGAN'
  | 'HALAL'
  | 'NON_VEG';

export type HotelType =
  | 'BUDGET'
  | 'STANDARD'
  | 'COMFORT'
  | 'LUXURY'
  | 'ULTRA_LUXURY'
  | 'HOSTEL'
  | 'CAMPING'
  | 'HOMESTAY';

export type TransportType =
  | 'FLIGHT'
  | 'TRAIN'
  | 'BUS'
  | 'CAR_RENTAL'
  | 'TAXI'
  | 'METRO'
  | 'FERRY'
  | 'BICYCLE';
