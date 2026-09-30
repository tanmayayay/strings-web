// Approximate lat/lng for major Indian music cities.
// Keys MUST match the city strings used across the app (see CITIES in
// src/data/demo.js and the `city` field on profiles/opportunities).
export const CITY_COORDS = {
  'Mumbai': { lat: 19.076, lng: 72.878 },
  'Delhi-NCR': { lat: 28.613, lng: 77.209 },
  'Delhi': { lat: 28.613, lng: 77.209 },
  'New Delhi': { lat: 28.613, lng: 77.209 },
  'Bengaluru': { lat: 12.972, lng: 77.595 },
  'Hyderabad': { lat: 17.385, lng: 78.487 },
  'Chennai': { lat: 13.083, lng: 80.271 },
  'Kolkata': { lat: 22.573, lng: 88.364 },
  'Pune': { lat: 18.521, lng: 73.857 },
  'Ahmedabad': { lat: 23.023, lng: 72.572 },
  'Jaipur': { lat: 26.913, lng: 75.787 },
  'Kochi': { lat: 9.931, lng: 76.267 },
  'Goa': { lat: 15.49, lng: 73.827 },
  'Chandigarh': { lat: 30.734, lng: 76.78 },
  'Lucknow': { lat: 26.847, lng: 80.947 },
  'Indore': { lat: 22.72, lng: 75.858 },
  'Surat': { lat: 21.171, lng: 72.831 },
  'Nagpur': { lat: 21.146, lng: 79.088 },
  'Bhopal': { lat: 23.26, lng: 77.413 },
  'Guwahati': { lat: 26.145, lng: 91.737 },
  'Dehradun': { lat: 30.317, lng: 78.034 },
  'Shimla': { lat: 31.104, lng: 77.174 },
  'Thiruvananthapuram': { lat: 8.524, lng: 76.936 },
  'Coimbatore': { lat: 11.017, lng: 76.956 },
  'Mysuru': { lat: 12.305, lng: 76.655 },
  'Vadodara': { lat: 22.308, lng: 73.181 },
  'Udaipur': { lat: 24.586, lng: 73.712 },
  'Amritsar': { lat: 31.634, lng: 74.873 },
  'Ludhiana': { lat: 30.901, lng: 75.857 },
  'Patna': { lat: 25.595, lng: 85.137 },
  'Ranchi': { lat: 23.344, lng: 85.31 },
  'Bhubaneswar': { lat: 20.296, lng: 85.824 },
};

/** Great-circle distance in km between two {lat, lng} points. */
export function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Distance in km between two city-name strings.
 * Returns null when either city has no coordinates on the map.
 */
export function cityDistanceKm(cityA, cityB) {
  const a = CITY_COORDS[cityA];
  const b = CITY_COORDS[cityB];
  if (!a || !b) return null;
  return haversineKm(a, b);
}
