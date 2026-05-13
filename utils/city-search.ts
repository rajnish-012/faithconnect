export type CityOption = {
  id: string;
  city: string;
  country: string;
  pincode: string;
};

const fallbackCities: CityOption[] = [
  { id: "mumbai-in-400001", city: "Mumbai", country: "India", pincode: "400001" },
  { id: "muzaffarpur-in-842001", city: "Muzaffarpur", country: "India", pincode: "842001" },
  { id: "meerut-in-250001", city: "Meerut", country: "India", pincode: "250001" },
  { id: "mysuru-in-570001", city: "Mysuru", country: "India", pincode: "570001" },
  { id: "madurai-in-625001", city: "Madurai", country: "India", pincode: "625001" },
  { id: "mangaluru-in-575001", city: "Mangaluru", country: "India", pincode: "575001" },
  { id: "moradabad-in-244001", city: "Moradabad", country: "India", pincode: "244001" },
  { id: "mathura-in-281001", city: "Mathura", country: "India", pincode: "281001" },
  { id: "mohali-in-160062", city: "Mohali", country: "India", pincode: "160062" },
  { id: "manali-in-175131", city: "Manali", country: "India", pincode: "175131" },
  { id: "delhi-in-110001", city: "Delhi", country: "India", pincode: "110001" },
  { id: "bengaluru-in-560001", city: "Bengaluru", country: "India", pincode: "560001" },
  { id: "kolkata-in-700001", city: "Kolkata", country: "India", pincode: "700001" },
  { id: "chennai-in-600001", city: "Chennai", country: "India", pincode: "600001" },
  { id: "hyderabad-in-500001", city: "Hyderabad", country: "India", pincode: "500001" },
  { id: "pune-in-411001", city: "Pune", country: "India", pincode: "411001" },
  { id: "ahmedabad-in-380001", city: "Ahmedabad", country: "India", pincode: "380001" },
  { id: "jaipur-in-302001", city: "Jaipur", country: "India", pincode: "302001" },
  { id: "lucknow-in-226001", city: "Lucknow", country: "India", pincode: "226001" },
  { id: "patna-in-800001", city: "Patna", country: "India", pincode: "800001" },
  { id: "varanasi-in-221001", city: "Varanasi", country: "India", pincode: "221001" },
  { id: "amritsar-in-143001", city: "Amritsar", country: "India", pincode: "143001" },
  { id: "bodh-gaya-in-824231", city: "Bodh Gaya", country: "India", pincode: "824231" },
];

export const formatCityOption = (city: CityOption) =>
  `${city.city}, ${city.country} - ${city.pincode}`;

export function searchFallbackCities(term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];

  return fallbackCities
    .filter((city) => city.city.toLowerCase().startsWith(normalized))
    .slice(0, 8);
}

export async function searchCities(term: string) {
  const fallback = searchFallbackCities(term);

  if (term.trim().length < 2) {
    return fallback;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&featuretype=city&q=${encodeURIComponent(
        term.trim(),
      )}`,
      {
        headers: {
          "User-Agent": "FaithConnectPrototype/1.0",
        },
      },
    );

    if (!response.ok) return fallback;

    const results = await response.json();
    const remoteCities: CityOption[] = results
      .map((item: any) => {
        const address = item.address ?? {};
        const city =
          address.city ||
          address.town ||
          address.municipality ||
          address.county ||
          item.name;
        const country = address.country;
        const pincode = address.postcode;

        if (!city || !country || !pincode) return null;

        return {
          id: String(item.place_id),
          city,
          country,
          pincode,
        };
      })
      .filter(Boolean);

    const merged = [...remoteCities, ...fallback];
    const seen = new Set<string>();

    return merged.filter((city) => {
      const key = `${city.city}-${city.country}-${city.pincode}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return fallback;
  }
}
