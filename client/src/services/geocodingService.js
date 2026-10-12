/**
 * Centralized Geocoding and Reverse-Geocoding Service for LOOOP
 * Accurately extracts City, Locality/Neighborhood, State, and Formatted Address
 * Features multi-tiered fallback:
 * 1. OpenStreetMap Nominatim reverse geocode
 * 2. BigDataCloud high-speed client reverse geocode
 * 3. Google Maps Geocoder (if available)
 */

export async function reverseGeocodeLocation(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return {
      city: 'Bengaluru',
      locality: 'Indiranagar',
      state: 'Karnataka',
      formattedAddress: 'Indiranagar, Bengaluru'
    };
  }

  // 1. Primary: OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;

        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.city_district ||
          addr.municipality ||
          addr.county ||
          addr.state_district ||
          'Bengaluru';

        const locality =
          addr.suburb ||
          addr.neighbourhood ||
          addr.quarter ||
          addr.residential ||
          addr.commercial ||
          addr.road ||
          city;

        const state = addr.state || 'Karnataka';
        const formattedAddress = data.display_name
          ? data.display_name.split(',').slice(0, 3).join(',').trim()
          : `${locality}, ${city}`;

        return {
          city,
          locality: locality !== city ? locality : (addr.suburb || locality),
          state,
          formattedAddress: [locality, city].filter(Boolean).join(', ') || formattedAddress,
          rawAddress: addr
        };
      }
    }
  } catch {
    // Proceed to next fallback
  }

  // 2. Secondary: BigDataCloud Reverse Geocoding Client
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const city = bdcData.city || bdcData.locality || 'Bengaluru';
      const locality = bdcData.localityInfo?.administrative?.[3]?.name || bdcData.locality || city;
      const state = bdcData.principalSubdivision || '';

      return {
        city,
        locality: locality !== city ? locality : city,
        state,
        formattedAddress: [locality, city].filter(Boolean).join(', ')
      };
    }
  } catch {
    // Proceed to Google Maps Geocoder fallback
  }

  // 3. Tertiary: Google Maps Geocoder if SDK is active
  if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const googleResult = await new Promise((resolve) => {
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          if (status === 'OK' && results?.[0]) resolve(results[0]);
          else resolve(null);
        });
      });

      if (googleResult) {
        let extractedLocality = '';
        let extractedCity = '';
        let extractedState = '';

        for (const comp of googleResult.address_components || []) {
          const types = comp.types || [];
          if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood')) {
            extractedLocality = comp.long_name;
          } else if (types.includes('locality')) {
            extractedCity = comp.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            extractedState = comp.long_name;
          }
        }

        const city = extractedCity || 'Bengaluru';
        const locality = extractedLocality || city;

        return {
          city,
          locality,
          state: extractedState,
          formattedAddress: [locality, city].filter(Boolean).join(', ') || googleResult.formatted_address
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    city: 'Bengaluru',
    locality: 'Indiranagar',
    state: 'Karnataka',
    formattedAddress: 'Indiranagar, Bengaluru'
  };
}

export default reverseGeocodeLocation;
