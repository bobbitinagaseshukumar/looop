const { INDIAN_CITIES, POPULAR_LOCATIONS, searchIndianCities } = require('../data/indianCities');

/**
 * Get popular locations for location modal (BookMyShow style)
 */
async function getPopularLocations() {
  return POPULAR_LOCATIONS.map((c, idx) => ({
    placeId: `pop_${c.city.toLowerCase()}_${idx}`,
    name: c.name,
    mainText: c.name,
    secondaryText: `${c.state}, India`,
    city: c.city,
    district: c.district || c.city,
    state: c.state,
    country: 'India',
    latitude: c.latitude,
    longitude: c.longitude,
    isPopular: true,
    order: c.order || idx + 1,
    type: c.type || 'CITY'
  }));
}

/**
 * Intelligent Location Search Autocomplete (Instant Local Directory + Live Nominatim)
 * Returns Google Maps & BookMyShow formatted place predictions
 */
async function searchLocations(queryStr) {
  const rawQuery = String(queryStr || '').trim();

  // If empty query, return popular locations
  if (!rawQuery) {
    return await getPopularLocations();
  }

  // 1. Instant match against comprehensive Indian Cities directory (0ms)
  const localMatches = searchIndianCities(rawQuery, 12).map((c) => ({
    placeId: `in_${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${c.state.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name: c.name,
    mainText: c.name,
    secondaryText: c.name !== c.city ? `${c.city}, ${c.state}, India` : `${c.state}, India`,
    city: c.city,
    district: c.district || c.city,
    locality: c.type === 'LOCALITY' || c.type === 'LANDMARK' ? c.name : c.city,
    state: c.state,
    country: 'India',
    latitude: c.latitude,
    longitude: c.longitude,
    type: c.type || 'CITY',
    source: 'INDIAN_DIRECTORY'
  }));

  // 2. Fetch live OpenStreetMap Nominatim for hyper-local places, streets, mandals & landmarks
  let liveMatches = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const geoUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(rawQuery)}&countrycodes=in&limit=8&addressdetails=1`;
    const response = await fetch(geoUrl, {
      headers: {
        'User-Agent': 'LooopMarketplace/2.0 (location-search-service; contact@looop.community)'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const geoResults = await response.json();
      if (Array.isArray(geoResults)) {
        liveMatches = geoResults.map((item) => {
          const addr = item.address || {};
          const city = addr.city || addr.town || addr.village || addr.county || item.name;
          const state = addr.state || addr.region || '';
          const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || item.name;
          const country = addr.country || 'India';
          const district = addr.county || addr.state_district || city;

          return {
            placeId: `geo_${item.place_id || Math.random().toString(36).substring(2, 8)}`,
            name: locality || city || item.name,
            mainText: locality || city || item.name,
            secondaryText: [city !== locality ? city : '', district !== city ? district : '', state, country].filter(Boolean).join(', '),
            city: city,
            locality: locality,
            district: district,
            state: state,
            country: country,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            type: addr.suburb || addr.neighbourhood ? 'LOCALITY' : 'CITY',
            source: 'NOMINATIM'
          };
        });
      }
    }
  } catch (geoErr) {
    // Non-critical: local directory results still provide instant matches
  }

  // 3. Merge Local Directory + Live OpenStreetMap (with deduplication)
  const results = [...localMatches];
  const seenKeys = new Set(localMatches.map((m) => `${m.name.toLowerCase()}_${m.state.toLowerCase()}`));

  for (const item of liveMatches) {
    const key = `${item.name.toLowerCase()}_${item.state.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push(item);
    }
  }

  // 4. If query was typed, return results (or empty array if no match found)
  // NEVER return POPULAR_CITIES when a search term was typed!
  return results.slice(0, 15);
}

module.exports = {
  getPopularLocations,
  searchLocations
};
