import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Search, ShieldCheck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, Popup } from 'react-leaflet';
import { reverseGeocodeLocation } from '../../services/geocodingService';

// Fix Leaflet marker icons safely in Vite bundlers
try {
  if (typeof window !== 'undefined' && L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });
  }
} catch (err) {
  console.warn('[Leaflet Init] Icon setup notice:', err);
}

const MapEventsHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
};

/**
 * Interactive Fallback Component using OpenStreetMap / Leaflet
 * Used when Google Maps API key has domain restrictions, quota limits, or auth failures.
 * Provides full map interactivity, location search, marker placement, and 500m privacy circle.
 */
export const GoogleMapsFallback = ({
  coordinates = [12.9716, 77.5946], // [lat, lng]
  locality = '',
  city = 'Bengaluru',
  items = [],
  interactive = false,
  onChange,
  height = '320px'
}) => {
  const parsePos = (coords) => {
    if (Array.isArray(coords) && coords.length >= 2) {
      const lat = Number(coords[0]);
      const lng = Number(coords[1]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    if (coords && typeof coords === 'object') {
      const lat = Number(coords.lat || coords.latitude);
      const lng = Number(coords.lng || coords.longitude);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return [12.9716, 77.5946];
  };

  const [position, setPosition] = useState(parsePos(coordinates));
  const [currentLocality, setCurrentLocality] = useState(locality);
  const [currentCity, setCurrentCity] = useState(city);
  const [searchQuery, setSearchQuery] = useState(locality ? `${locality}, ${city}` : city);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setPosition(parsePos(coordinates));
  }, [coordinates]);

  useEffect(() => {
    if (locality || city) {
      setCurrentLocality(locality);
      setCurrentCity(city);
      setSearchQuery(locality ? `${locality}, ${city}` : city);
    }
  }, [locality, city]);

  const handleMapClick = async (lat, lng) => {
    if (!interactive) return;
    setPosition([lat, lng]);
    const geo = await reverseGeocodeLocation(lat, lng);
    setCurrentLocality(geo.locality);
    setCurrentCity(geo.city);
    setSearchQuery(geo.formattedAddress);
    if (onChange) {
      onChange({
        coordinates: [lat, lng],
        locality: geo.locality,
        city: geo.city,
        formattedAddress: geo.formattedAddress
      });
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        setPosition([lat, lng]);
        const geo = await reverseGeocodeLocation(lat, lng);
        setCurrentLocality(geo.locality);
        setCurrentCity(geo.city);
        setSearchQuery(geo.formattedAddress);

        if (onChange) {
          onChange({
            coordinates: [lat, lng],
            locality: geo.locality,
            city: geo.city,
            formattedAddress: geo.formattedAddress
          });
        }
      }
    } catch (err) {
      console.warn('[Map Fallback] Nominatim search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        const geo = await reverseGeocodeLocation(lat, lng);
        setCurrentLocality(geo.locality);
        setCurrentCity(geo.city);
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
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation failed:', err);
        alert('Could not retrieve current location. Please search manually using the search bar.');
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {/* Search Bar for Interactive Mode */}
      {interactive && (
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, area or landmark..."
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.875rem',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md, 8px)',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>

          <button
            type="button"
            onClick={handleCurrentLocation}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md, 8px)',
              backgroundColor: '#ecfdf5',
              border: '1px solid #6ee7b7',
              color: '#047857',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Navigation size={15} />
            <span>Use Current Location</span>
          </button>
        </form>
      )}

      {/* Map Canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: 'var(--radius-lg, 12px)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <MapContainer
          key={`${position[0]}-${position[1]}`}
          center={position}
          zoom={13}
          scrollWheelZoom={interactive}
          zoomControl={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {interactive && <MapEventsHandler onLocationSelect={handleMapClick} />}

          {/* Interactive Marker or Selected Position Marker */}
          <Marker position={position} />

          {/* 500m Privacy Radius Zone */}
          <Circle
            center={position}
            radius={500}
            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2 }}
          />

          {/* Render Items if provided (e.g. Browse Map mode) */}
          {items &&
            items.map((item, idx) => {
              const coords = item.locationCoordinates?.coordinates;
              if (!coords || coords.length !== 2) return null;
              const itemLat = Number(coords[1]);
              const itemLng = Number(coords[0]);
              if (isNaN(itemLat) || isNaN(itemLng)) return null;

              return (
                <Marker key={item.id || item._id || idx} position={[itemLat, itemLng]}>
                  <Popup>
                    <div style={{ padding: '4px', maxWidth: '180px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#0f172a' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '2px' }}>
                        {item.category} · {item.sharingType}
                      </div>
                      <a
                        href={`/items/${item.id || item._id}`}
                        style={{
                          display: 'inline-block',
                          marginTop: '6px',
                          fontSize: '0.75rem',
                          color: '#2563eb',
                          fontWeight: 600
                        }}
                      >
                        View Item Details →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>
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
          <strong>Privacy Safe:</strong> LOOOP displays an approximate 500m pickup zone ({[locality, city].filter(Boolean).join(', ')}). Your exact street address is never displayed publicly.
        </span>
      </div>
    </div>
  );
};

export default GoogleMapsFallback;
