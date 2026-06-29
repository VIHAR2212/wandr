// Maps common city names to real Indian Railways station codes.
// Every code below exists in the seeded train_stations table.
// Multiple codes per city = multiple major stations (e.g. Delhi has NDLS, DLI, NZM).

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

/** Minimum input length before attempting fuzzy/loose matching. */
const MIN_LOOSE_MATCH_LEN = 3;

/**
 * Resolve a free-text city name to station codes.
 * Returns empty array if city not found — callers should fall back to AI-only.
 */
export function getStationCodesForCity(city: string): string[] {
  if (!city || typeof city !== "string") return [];

  const normalised = city.trim().toUpperCase();

  if (!normalised) return [];

  // 1) Exact match
  if (CITY_STATION_CODES[normalised]) return CITY_STATION_CODES[normalised];

  // 2) Loose match — only if input is long enough to avoid false positives
  //    (e.g. "A" would match AGRA, AHMEDABAD, AMRITSAR, etc.)
  if (normalised.length >= MIN_LOOSE_MATCH_LEN) {
    for (const [key, codes] of Object.entries(CITY_STATION_CODES)) {
      if (normalised.includes(key) || key.includes(normalised)) {
        return codes;
      }
    }
  }

  return [];
}
