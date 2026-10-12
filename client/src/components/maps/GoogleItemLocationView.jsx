import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ShieldCheck, Navigation } from 'lucide-react';
import { loadGoogleMaps, getGoogleMapsError, subscribeGoogleMapsError } from '../../services/googleMapsLoader';
import GoogleMapsFallback from './GoogleMapsFallback';

/**
 * Privacy-Safe Google Maps Item Location View
 * Displays item pickup zone on a Google Map with a 500m privacy circle.
 * Guarantees private residential street addresses are NEVER exposed.
 */
export const GoogleItemLocationView = ({
  coordinates = [12.9716, 77.5946], // [lat, lng]
  locality = '',
  city = 'Bengaluru',
  height = '240px'
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circleRef = useRef(null);
  const markerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(getGoogleMapsError());

  useEffect(() => {
    return subscribeGoogleMapsError((err) => setError(err));
  }, []);

  useEffect(() => {
    let mounted = true;

    const lat = Number(coordinates[0]) || 12.9716;
    const lng = Number(coordinates[1]) || 77.5946;
    const pos = { lat, lng };

    loadGoogleMaps()
      .then((maps) => {
        if (!mounted || !mapContainerRef.current) return;

        const map = new maps.Map(mapContainerRef.current, {
          center: pos,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Custom Center Marker
        markerRef.current = new maps.Marker({
          position: pos,
          map,
          title: `LOOOP Pickup Zone (${locality || city})`,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#059669',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5
          }
        });

        // 500m Privacy Radius Circle
        circleRef.current = new maps.Circle({
          strokeColor: '#10b981',
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.2,
          map,
          center: pos,
          radius: 500 // 500 meters privacy zone
        });

        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setLoading(false);
        setError(err?.message || 'Google Maps failed to load');
      });

    return () => {
      mounted = false;
      if (circleRef.current) circleRef.current.setMap(null);
      if (markerRef.current) markerRef.current.setMap(null);
    };
  }, [coordinates, locality, city]);

  if (error) {
    return (
      <GoogleMapsFallback
        coordinates={coordinates}
        locality={locality}
        city={city}
        height={height}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
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
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '0.85rem'
            }}
          >
            Loading Map Zone...
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.78rem',
          color: '#047857',
          fontWeight: 600,
          backgroundColor: '#ecfdf5',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid #a7f3d0'
        }}
      >
        <ShieldCheck size={15} />
        <span>Approximate 500m pickup zone in {[locality, city].filter(Boolean).join(', ')}. Exact street address is kept private.</span>
      </div>
    </div>
  );
};

export default GoogleItemLocationView;
