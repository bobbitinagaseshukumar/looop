import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, Navigation, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import {
  loadGoogleMaps,
  approximateCoordinates,
  subscribeGoogleMapsError,
  getGoogleMapsError
} from '../../services/googleMapsLoader';
import { reverseGeocodeLocation } from '../../services/geocodingService';
import GoogleMapsFallback from './GoogleMapsFallback';

/**
 * Professional Google Maps Location Picker for LOOOP
 * Features: Places Autocomplete search, drag & click interaction, current location button,
 * and visual 500m Privacy Radius Circle ensuring exact home addresses are NEVER stored.
 */
export const GoogleMapPicker = ({
  initialCoordinates = [12.9716, 77.5946], // [lat, lng] Default Bengaluru
  initialLocality = '',
  initialCity = 'Bengaluru',
  onChange,
  height = '320px'
}) => {
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(getGoogleMapsError());
  const [locality, setLocality] = useState(initialLocality);
  const [city, setCity] = useState(initialCity);
  const [searchQuery, setSearchQuery] = useState(
    initialLocality ? `${initialLocality}, ${initialCity}` : initialCity
  );
  const [coordinates, setCoordinates] = useState(initialCoordinates);
  const [isLocating, setIsLocating] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('Approximate 500m neighborhood radius recorded for privacy');

  useEffect(() => {
    if (initialLocality || initialCity) {
      setLocality(initialLocality);
      setCity(initialCity);
      setSearchQuery(initialLocality ? `${initialLocality}, ${initialCity}` : initialCity);
    }
  }, [initialLocality, initialCity]);

  // Reverse Geocoding helper to extract city & locality from lat/lng
  const reverseGeocode = useCallback(
    async (lat, lng) => {
      const geo = await reverseGeocodeLocation(lat, lng);
      setLocality(geo.locality);
      setCity(geo.city);
      setSearchQuery(geo.formattedAddress);

      if (onChange) {
        onChange({
          coordinates: [lat, lng],
          locality: geo.locality,
          city: geo.city,
          formattedAddress: geo.formattedAddress
        });
      }
    },
    [onChange]
  );

  // Update map marker and 500m privacy circle position
  const updateMapPosition = useCallback(
    (lat, lng, doReverseGeocode = true) => {
      if (!mapInstanceRef.current || !markerRef.current) return;
      const pos = { lat, lng };

      mapInstanceRef.current.panTo(pos);
      markerRef.current.setPosition(pos);

      if (circleRef.current) {
        circleRef.current.setCenter(pos);
      } else if (window.google?.maps?.Circle) {
        circleRef.current = new window.google.maps.Circle({
          strokeColor: '#10b981',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.18,
          map: mapInstanceRef.current,
          center: pos,
          radius: 500 // 500 meters privacy zone
        });
      }

      setCoordinates([lat, lng]);

      if (doReverseGeocode) {
        reverseGeocode(lat, lng);
      }
    },
    [reverseGeocode]
  );

  // Subscribe to global Google Maps errors (e.g. auth failure)
  useEffect(() => {
    const unsub = subscribeGoogleMapsError((err) => {
      setError(err || 'Google Maps failed to authenticate.');
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let observer = null;

    loadGoogleMaps()
      .then((maps) => {
        if (!mounted || !mapContainerRef.current) return;

        const startLat = coordinates[0] || 12.9716;
        const startLng = coordinates[1] || 77.5946;
        const startPos = { lat: startLat, lng: startLng };

        // Initialize Google Map
        const map = new maps.Map(mapContainerRef.current, {
          center: startPos,
          zoom: 14,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Custom Marker
        const marker = new maps.Marker({
          position: startPos,
          map,
          draggable: true,
          title: 'Selected LOOOP Pickup Zone',
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#059669',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        markerRef.current = marker;

        // Privacy Circle
        circleRef.current = new maps.Circle({
          strokeColor: '#10b981',
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.2,
          map,
          center: startPos,
          radius: 500 // 500 meters privacy radius
        });

        // Click map to select location
        map.addListener('click', (e) => {
          if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            // Round/approximate coordinates slightly for privacy
            const [approxLat, approxLng] = approximateCoordinates(lat, lng, 100);
            updateMapPosition(approxLat, approxLng, true);
          }
        });

        // Drag marker to adjust location
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) {
            const [approxLat, approxLng] = approximateCoordinates(pos.lat(), pos.lng(), 100);
            updateMapPosition(approxLat, approxLng, true);
          }
        });

        // Places Autocomplete Setup
        if (searchInputRef.current && maps.places) {
          const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
            types: ['geocode', 'establishment'],
            fields: ['geometry', 'name', 'formatted_address', 'address_components']
          });

          autocomplete.bindTo('bounds', map);
          autocompleteRef.current = autocomplete;

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const [approxLat, approxLng] = approximateCoordinates(lat, lng, 150);
              updateMapPosition(approxLat, approxLng, true);
            }
          });
        }

        if (mapContainerRef.current) {
          observer = new MutationObserver(() => {
            if (
              mapContainerRef.current?.querySelector?.('.gm-err-container') ||
              mapContainerRef.current?.querySelector?.('[class*="gm-err"]')
            ) {
              if (mounted) {
                setError('Google Maps authentication failed.');
              }
            }
          });
          observer.observe(mapContainerRef.current, { childList: true, subtree: true });
        }

        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setLoading(false);
        setError(err?.message || 'Google Maps failed to load');
      });

    return () => {
      mounted = false;
      if (observer) {
        observer.disconnect();
      }
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, []);

  // Request browser current location on user button click
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Apply 300m privacy jitter to customer's precise geolocation
        const [approxLat, approxLng] = approximateCoordinates(lat, lng, 300);
        updateMapPosition(approxLat, approxLng, true);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('Could not retrieve current location. Please search manually using the location bar.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  if (error) {
    return (
      <GoogleMapsFallback
        coordinates={coordinates}
        locality={locality}
        city={city}
        height={height}
        interactive={true}
        onChange={onChange}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {/* Location Search Bar & Current Location Button */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b'
            }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search area, locality, or landmark (e.g. Indiranagar, HSR Layout)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.4rem',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.875rem',
              color: '#0f172a',
              backgroundColor: '#ffffff',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--color-primary-50, #ecfdf5)',
            border: '1px solid var(--color-primary-300, #6ee7b7)',
            color: 'var(--color-primary-700, #047857)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: isLocating ? 'wait' : 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Navigation size={15} className={isLocating ? 'animate-spin' : ''} />
          <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
        </button>
      </div>

      {/* Map Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: 'var(--radius-lg, 12px)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#f8fafc',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: '#64748b'
            }}
          >
            <div className="animate-spin" style={{ width: 24, height: 24, border: '3px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loading Google Maps...</span>
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Privacy Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md, 8px)',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          fontSize: '0.78rem',
          fontWeight: 500
        }}
      >
        <ShieldCheck size={16} color="#15803d" />
        <span>
          <strong>Privacy Safe:</strong> LOOOP saves an approximate 500m pickup zone ({[locality, city].filter(Boolean).join(', ')}). Your exact street address is never displayed publicly.
        </span>
      </div>
    </div>
  );
};

export default GoogleMapPicker;
