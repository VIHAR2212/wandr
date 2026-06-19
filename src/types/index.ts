// src/types/index.ts
export type TripPurpose =
  | 'ADVENTURE' | 'DEVOTIONAL' | 'HIKING' | 'HONEYMOON' | 'FAMILY'
  | 'PHOTOGRAPHY' | 'BUSINESS' | 'FOOD_EXPLORATION' | 'WELLNESS'
  | 'CULTURAL' | 'SOLO' | 'BACKPACKING';

export type FoodPreference = 'VEG' | 'JAIN' | 'VEGAN' | 'HALAL' | 'NON_VEG';

export type HotelType =
  | 'BUDGET' | 'STANDARD' | 'COMFORT' | 'LUXURY' | 'ULTRA_LUXURY'
  | 'HOSTEL' | 'CAMPING' | 'HOMESTAY';

export type TransportType =
  | 'FLIGHT' | 'TRAIN' | 'BUS' | 'CAR_RENTAL' | 'TAXI'
  | 'METRO' | 'FERRY' | 'BICYCLE' | 'WALKING';

export type ActivityType =
  | 'TRANSPORT' | 'ACCOMMODATION' | 'SIGHTSEEING' | 'RESTAURANT'
  | 'ADVENTURE' | 'SHOPPING' | 'REST' | 'CEREMONY' | 'MEETING';

export type TripStatus =
  | 'PLANNING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface TripFormData {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  purpose: TripPurpose;
  foodPreference: FoodPreference;
  hotelPreference: HotelType;
  transportPreferences: TransportType[];
  specialRequests?: string;
  includeHiddenGems?: boolean;
  flexibleBudget?: boolean;
}

export interface Activity {
  id?: string;
  time: string;
  duration: number;
  type: ActivityType;
  title: string;
  description: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  cost: number;
  notes?: string | null;
  bookingUrl?: string | null;
  isCompleted?: boolean;
  tips?: string[];
  alternatives?: string[];
}

export interface TripDay {
  id?: string;
  dayNumber: number;
  date: string;
  theme: string;
  summary: string;
  activities: Activity[];
  totalCost: number;
  weather?: WeatherInfo;
}

export interface BudgetBreakdown {
  total: number;
  actualCost?: number;
  transport: number;
  accommodation: number;
  food: number;
  activities: number;
  miscellaneous: number;
  emergencyFund: number;
  perDay: number;
  perPerson: number;
  breakdown: BudgetItem[];
}

export interface BudgetItem {
  category: string;
  amount: number;
  percentage: number;
  details: string;
}

export interface WeatherInfo {
  date: string;
  condition: string;
  temperature: { min: number; max: number; unit: 'C' | 'F' };
  humidity: number;
  rainfall: number;
  icon: string;
  alert?: string | null;
}

export interface Hotel {
  name: string;
  type: HotelType;
  location: string;
  lat?: number | null;
  lng?: number | null;
  pricePerNight: number;
  totalCost?: number;
  rating: number;
  amenities: string[];
  bookingUrl?: string | null;
  phone?: string | null;
  distance?: string;
  images?: string[];
  pros?: string[];
  cons?: string[];
}

export interface Restaurant {
  name: string;
  cuisine: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  priceRange: string;
  rating: number;
  specialties: string[];
  openingHours: string;
  phone?: string | null;
  dietaryOptions: FoodPreference[];
  mustTry?: string[];
}

export interface HiddenGem {
  name: string;
  type: string;
  description: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  bestTime: string;
  cost: number;
  crowdLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  insiderTip: string;
}

export interface EmergencyContact {
  name: string;
  number: string;
  type: 'POLICE' | 'AMBULANCE' | 'FIRE' | 'EMBASSY' | 'TOURIST_HELPLINE';
}

export interface NearbyPlace {
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  distance?: string;
}

export interface SafetyInfo {
  overallScore: number;
  crimeLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  scamAlerts: string[];
  emergencyContacts: EmergencyContact[];
  hospitals: NearbyPlace[];
  policeStations?: NearbyPlace[];
  safeAreas: string[];
  avoidAreas: string[];
  travelAdvisory?: string | null;
  vaccinations?: string[];
}

export interface PackingItem {
  category: string;
  items: { name: string; essential: boolean; quantity?: string }[];
}

export interface RouteSegment {
  from: string;
  to: string;
  mode: TransportType;
  duration: string;
  cost: number;
  details: string;
  bookingInfo?: string;
}

export interface TransportGuide {
  primaryRoute: RouteSegment[];
  alternatives?: RouteSegment[][];
  totalTransportCost: number;
  tips: string[];
}

export interface GeneratedTrip {
  title: string;
  summary: string;
  totalCost?: number;
  days: TripDay[];
  budget: BudgetBreakdown;
  hotels: Hotel[];
  restaurants: Restaurant[];
  hiddenGems: HiddenGem[];
  safety: SafetyInfo;
  packingList: PackingItem[];
  seasonalTips: string[];
  localPhrases?: { phrase: string; translation: string; pronunciation: string }[];
  transportGuide?: TransportGuide;
  weatherForecast?: WeatherInfo[];
  crowdPrediction?: {
    peak: string[];
    bestTimeToVisit: string[];
    avoidDates: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  metadata?: {
    tripId?: string;
    suggestions?: string[];
  };
}
