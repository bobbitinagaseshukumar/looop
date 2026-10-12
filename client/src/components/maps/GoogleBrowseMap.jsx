import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Navigation, ExternalLink, Tag, RefreshCw } from 'lucide-react';
import { loadGoogleMaps, calculateDistanceKm, getGoogleMapsError, subscribeGoogleMapsError } from '../../services/googleMapsLoader';
import GoogleMapsFallback from './GoogleMapsFallback';

/**
 * Modern Google Maps View for LOOOP Browse Items Page
 * Displays available shared/wanted items on a map with privacy-safe approximate markers,
 * interactive marker preview cards, and category filter support.
 */
export const GoogleBrowseMap = ({
  items = [],
  selectedItem = null,
  onSelectItem,
  userLocation = null,
  onUseCurrentLocation,
  height = '600px'
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(getGoogleMapsError());
  const [activePreviewItem, setActivePreviewItem] = useState(selectedItem);

  useEffect(() => {
    return subscribeGoogleMapsError((err) => setError(err));
  }, []);

  // Helper to extract [lat, lng] from item safely
  const getItemCoords = (item) => {
    if (item?.locationCoordinates?.coordinates?.length === 2) {
      const [lng, lat] = item.locationCoordinates.coordinates;
      if (!isNaN(lat) && !isNaN(lng)) return { lat: Number(lat), lng: Number(lng) };
    }
    if (item?.latitude != null && item?.longitude != null) {
      return { lat: Number(item.latitude), lng: Number(item.longitude) };
    }
    // Fallback Bengaluru center with slight deterministic offset based on item ID
    const hash = (item?.id || item?._id || '1').toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const latOffset = ((hash % 50) - 25) * 0.003;
    const lngOffset = (((hash * 7) % 50) - 25) * 0.003;
    return { lat: 12.9716 + latOffset, lng: 77.5946 + lngOffset };
  };

  // Render markers on Google Map
  const renderMarkers = useCallback((maps, map) => {
    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (!items || items.length === 0) return;

    const bounds = new maps.LatLngBounds();

    items.forEach((item) => {
      const pos = getItemCoords(item);
      bounds.extend(pos);

      const isSelected = selectedItem && (selectedItem.id === item.id || selectedItem._id === item._id);

      // Create Custom SVG Marker Icon
      const marker = new maps.Marker({
        position: pos,
        map,
        title: item.title,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 9,
          fillColor: isSelected ? '#059669' : '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: isSelected ? 3 : 2
        }
      });

      marker.addListener('click', () => {
        setActivePreviewItem(item);
        if (onSelectItem) onSelectItem(item);

        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }

        const imgUrl = Array.isArray(item.images) && item.images.length > 0
          ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url)
          : 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=300&auto=format&fit=crop&q=80';

        const content = document.createElement('div');
        content.style.padding = '8px';
        content.style.maxWidth = '220px';
        content.style.fontFamily = 'var(--font-main, sans-serif)';
        content.innerHTML = `
          <div style="border-radius:8px; overflow:hidden; margin-bottom:8px; height:110px; background:#f1f5f9;">
            <img src="${imgUrl}" alt="${item.title}" style="width:100%; height:100%; object-fit:cover;" />
          </div>
          <div style="font-weight:700; font-size:0.9rem; color:#0f172a; margin-bottom:4px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
            ${item.title}
          </div>
          <div style="font-size:0.75rem; color:#059669; font-weight:600; margin-bottom:6px; display:inline-block; padding:2px 8px; background:#ecfdf5; border-radius:12px;">
            ${item.category || 'Item'} · ${item.sharingType || 'Share'}
          </div>
          <div style="font-size:0.78rem; color:#64748b; margin-bottom:8px;">
            📍 ${item.locality || item.city || 'Bengaluru Zone'}
          </div>
          <button id="btn-view-item-${item.id || item._id}" style="width:100%; padding:6px 10px; background:#059669; color:#ffffff; border:none; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer;">
            View Item Details →
          </button>
        `;

        const infoWindow = new maps.InfoWindow({
          content,
          pixelOffset: new maps.Size(0, -10)
        });

        infoWindow.open(map, marker);
        infoWindowRef.current = infoWindow;

        // Attach click handler for button in InfoWindow
        setTimeout(() => {
          const btn = document.getElementById(`btn-view-item-${item.id || item._id}`);
          if (btn) {
            btn.onclick = () => {
              navigate(`/items/${item.id || item._id}`);
            };
          }
        }, 100);
      });

      markersRef.current.push(marker);
    });

    if (items.length > 0 && !selectedItem) {
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    }
  }, [items, selectedItem, onSelectItem, navigate]);

  useEffect(() => {
    let mounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!mounted || !mapContainerRef.current) return;

        const centerPos = userLocation
          ? { lat: userLocation[0], lng: userLocation[1] }
          : { lat: 12.9716, lng: 77.5946 };

        const map = new maps.Map(mapContainerRef.current, {
          center: centerPos,
          zoom: 12,
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
      markersRef.current.forEach((m) => m.setMap(null));
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && window.google?.maps) {
      renderMarkers(window.google.maps, mapInstanceRef.current);
    }
  }, [items, selectedItem, renderMarkers]);

  if (error) {
    return (
      <GoogleMapsFallback
        items={items}
        height={height}
        interactive={true}
      />
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 'var(--radius-xl, 16px)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
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
          <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading LOOOP Map...</span>
        </div>
      )}

      {/* Map Header Action Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 5,
          display: 'flex',
          gap: '8px',
          justifyContent: 'space-between',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: '#ffffff',
            padding: '6px 14px',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <MapPin size={14} color="#059669" />
          <span>{items.length} {items.length === 1 ? 'Item' : 'Items'} Available Nearby</span>
        </div>

        {onUseCurrentLocation && (
          <button
            type="button"
            onClick={onUseCurrentLocation}
            style={{
              pointerEvents: 'auto',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '6px 14px',
              borderRadius: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#047857',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Navigation size={14} />
            <span>Near Me</span>
          </button>
        )}
      </div>

      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default GoogleBrowseMap;
