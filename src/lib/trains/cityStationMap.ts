// Maps common city names (as a user/AI would type them) to real Indian
// Railways station codes. Verified against datameet/railways stations.json —
// every code below exists in the seeded train_stations table.
//
// Multiple codes per city = multiple major stations in that city (e.g. Delhi
// has NDLS, DLI, NZM). The lookup tries all of them when searching trains.
//
// Scope: ~40 major cities. Not exhaustive — add more entries here as needed,
// just confirm the code exists in stations.json first.

export const CITY_STATION_CODES: Record<string, string[]> = {
  DELHI: ["NDLS", "DLI", "NZM", "DEC"],
  "NEW DELHI": ["NDLS"],
  MUMBAI: ["CSTM", "BCT", "LTT", "DR"],
  BANGALORE: ["SBC", "BNC", "YPR"],
  BENGALURU: ["SBC", "BNC", "YPR"],
  CHENNAI: ["MAS", "MS"],
  KOLKATA: ["KOAA", "SDAH", "HWH"],
  HYDERABAD: ["HYB", "SC"],
  SECUNDERABAD: ["SC"],
  PUNE: ["PUNE"],
  AHMEDABAD: ["ADI"],
  JAIPUR: ["JP"],
  LUCKNOW: ["LKO", "LJN"],
  KANPUR: ["CNB"],
  NAGPUR: ["NGP"],
  INDORE: ["INDB"],
  BHOPAL: ["BPL"],
  PATNA: ["PNBE"],
  VADODARA: ["BRC"],
  BARODA: ["BRC"],
  SURAT: ["ST"],
  COIMBATORE: ["CBE"],
  KOCHI: ["ERS"],
  COCHIN: ["ERS"],
  ERNAKULAM: ["ERS"],
  GOA: ["MAO"],
  MADGAON: ["MAO"],
  PANAJI: ["MAO"],
  VARANASI: ["BSB"],
  BANARAS: ["BSB"],
  AMRITSAR: ["ASR"],
  CHANDIGARH: ["CDG"],
  GUWAHATI: ["GHY"],
  BHUBANESWAR: ["BBS"],
  RANCHI: ["RNC"],
  RAIPUR: ["R"],
  DEHRADUN: ["DDN"],
  AGRA: ["AGC"],
  JODHPUR: ["JU"],
  UDAIPUR: ["UDZ"],
  MYSORE: ["MYS"],
  MYSURU: ["MYS"],
  MANGALORE: ["MAQ", "MAJN"],
  MANGALURU: ["MAQ", "MAJN"],
  VISAKHAPATNAM: ["VSKP"],
  VIZAG: ["VSKP"],
  VIJAYAWADA: ["BZA"],
  TRIVANDRUM: ["TVC"],
  THIRUVANANTHAPURAM: ["TVC"],
  MADURAI: ["MDU"],
  NASIK: ["NK"],
  NASHIK: ["NK"],
};

/**
 * Resolve a free-text city name (as typed by a user or returned by the AI)
 * to a list of known station codes. Returns an empty array if the city
 * isn't in the major-cities map — callers should treat that as "no real
 * train data available, fall back to AI-only suggestion."
 */
export function getStationCodesForCity(city: string): string[] {
  const normalised = city.trim().toUpperCase();

  if (CITY_STATION_CODES[normalised]) return CITY_STATION_CODES[normalised];

  // Loose match: city name appears in a known key, or vice versa
  // (handles "Mumbai, Maharashtra" or "New Delhi, India" style inputs)
  for (const [key, codes] of Object.entries(CITY_STATION_CODES)) {
    if (normalised.includes(key) || key.includes(normalised)) {
      return codes;
    }
  }

  return [];
}
