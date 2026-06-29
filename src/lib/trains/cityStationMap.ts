// Maps common city names to real Indian Railways station codes.

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

const MIN_LOOSE_MATCH_LEN = 3;

export function getStationCodesForCity(city: string): string[] {
  if (!city || typeof city !== "string") return [];

  const normalised = city.trim().toUpperCase();

  if (!normalised) return [];

  if (CITY_STATION_CODES[normalised]) return CITY_STATION_CODES[normalised];

  if (normalised.length >= MIN_LOOSE_MATCH_LEN) {
    for (const [key, codes] of Object.entries(CITY_STATION_CODES)) {
      if (normalised.includes(key) || key.includes(normalised)) {
        return codes;
      }
    }
  }

  return [];
}
