import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps, getGoogleMapsError, subscribeGoogleMapsError } from '../../services/googleMapsLoader';
import GoogleMapsFallback from './GoogleMapsFallback';

/**
 * Reusable Core Google Map Component for LOOOP
 * Conceptual API:
 * <GoogleMap center={[lat, lng]} zoom={14} markers={[]} onMarkerClick={...} polyline="..." height="450px" />
 */
export const GoogleMap = ({
  center = [12.9716, 77.5946], // [lat, lng]
  zoom = 12,
  markers = [],
  selectedMarkerId = null,
  onMarkerClick,
  onMapClick,
  polyline = '',
  height = '450px',
  className = '',
  style = {}
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const renderedMarkersRef = useRef([]);
  const polylineRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(getGoogleMapsError());

  useEffect(() => {
    return subscribeGoogleMapsError((err) => setError(err));
  }, []);

  const renderMarkers = useCallback((maps, map) => {
    // Clear old markers
    renderedMarkersRef.current.forEach((m) => m.setMap(null));
    renderedMarkersRef.current = [];

    if (!markers || markers.length === 0) return;

    const bounds = new maps.LatLngBounds();

    markers.forEach((m) => {
      const lat = Number(m.latitude || m.lat || m.coordinates?.[0]);
      const lng = Number(m.longitude || m.lng || m.coordinates?.[1]);

      if (isNaN(lat) || isNaN(lng)) return;

      const pos = { lat, lng };
      bounds.extend(pos);

      const isSelected = selectedMarkerId && (selectedMarkerId === m.id || selectedMarkerId === m._id);

      const marker = new maps.Marker({
        position: pos,
        map,
        title: m.title || m.label || 'LOOOP Location',
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 9,
          fillColor: isSelected ? '#059669' : m.color || '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: isSelected ? 3 : 2
        }
      });

      marker.addListener('click', () => {
        if (onMarkerClick) onMarkerClick(m);
      });

      renderedMarkersRef.current.push(marker);
    });

    if (markers.length > 1 && !selectedMarkerId) {
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    }
  }, [markers, selectedMarkerId, onMarkerClick]);

  useEffect(() => {
    let mounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!mounted || !mapContainerRef.current) return;

        const startPos = { lat: Number(center[0]), lng: Number(center[1]) };

        const map = new maps.Map(mapContainerRef.current, {
          center: startPos,
          zoom,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        if (onMapClick) {
          map.addListener('click', (e) => {
            if (e.latLng) {
              onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            }
          });
        }

        renderMarkers(maps, map);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setLoading(false);
        setError(err?.message || 'Google Maps failed to load');
      });

    return () => {
      mounted = false;
      renderedMarkersRef.current.forEach((m) => m.setMap(null));
      if (polylineRef.current) polylineRef.current.setMap(null);
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && window.google?.maps) {
      renderMarkers(window.google.maps, mapInstanceRef.current);
    }
  }, [markers, selectedMarkerId, renderMarkers]);

  useEffect(() => {
    if (mapInstanceRef.current && window.google?.maps && polyline) {
      if (polylineRef.current) polylineRef.current.setMap(null);

      try {
        const decodedPath = window.google.maps.geometry.polyline.decodePath(polyline);
        polylineRef.current = new window.google.maps.Polyline({
          path: decodedPath,
          geodesic: true,
          strokeColor: '#059669',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map: mapInstanceRef.current
        });
      } catch (err) {
        console.warn('[GoogleMap] Could not decode polyline:', err);
      }
    }
  }, [polyline]);

  if (error) {
    return <GoogleMapsFallback message={error} height={height} onRetry={() => window.location.reload()} />;
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height,
        minHeight: '280px',
        borderRadius: 'var(--radius-xl, 16px)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        ...style
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
          <div className="animate-spin" style={{ width: 26, height: 26, border: '3px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Loading Google Map...</span>
        </div>
      )}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default GoogleMap;
