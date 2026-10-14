import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Navigation, X, Building2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useLocationContext } from '../../context/LocationContext';
import { loadGoogleMaps, getGoogleMapsApiKey } from '../../services/googleMapsLoader';
import { searchIndianCities, POPULAR_LOCATIONS } from '../../data/indianCities';
import api from '../../services/api';

const DEFAULT_POPULAR = POPULAR_LOCATIONS.slice(0, 16);

export const BookMyShowLocationModal = ({ isOpen, onClose }) => {
  const {
    location,
    setManualLocation,
    requestFreshGPS,
    isGeoLoading,
    geoError
  } = useLocationContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [popularCities, setPopularCities] = useState(DEFAULT_POPULAR);
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('idle'); // 'idle' | 'searching' | 'results' | 'no_results' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchInputRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const lastRequestIdRef = useRef(0);

  // Dev-only Diagnostic Log
  useEffect(() => {
    if (import.meta.env.DEV) {
      const key = getGoogleMapsApiKey();
      console.log('[LOOOP Maps] API key configured:', key && key !== 'YOUR_GOOGLE_MAPS_API_KEY' ? 'YES' : 'NO');
    }
  }, []);

  // Initialize Google Maps Places & Geocoder SDK
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!mounted) return;
        if (maps.places && !autocompleteServiceRef.current) {
          autocompleteServiceRef.current = new maps.places.AutocompleteService();
        }
        if (maps.Geocoder && !geocoderRef.current) {
          geocoderRef.current = new maps.Geocoder();
        }
      })
      .catch((err) => {
        console.warn('[LOOOP Maps] Places Autocomplete SDK notice:', err?.message || err);
      });

    const fetchPopular = async () => {
      try {
        const res = await api.get('/location/popular');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setPopularCities(res.data.data);
        }
      } catch (err) {
        // Keep default popular list
      }
    };
    fetchPopular();

    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 120);

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Execute Real Places & Cities Autocomplete Search (Instant 0ms Local + Live Geocoder)
  useEffect(() => {
    const q = searchQuery.trim();

    if (!q) {
      setSearchResults([]);
      setSearchStatus('idle');
      setStatusMessage('');
      setSelectedIndex(-1);
      return;
    }

    const requestId = ++lastRequestIdRef.current;

    // 1. Instant 0-second matching against rich Indian Cities directory
    const instantMatches = searchIndianCities(q, 12).map((c) => ({
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

    if (instantMatches.length > 0) {
      setSearchResults(instantMatches);
      setSearchStatus('results');
    } else {
      setSearchStatus('searching');
      setStatusMessage('Searching locations...');
    }
    setSelectedIndex(-1);

    // 2. Fetch server & live geocoder in parallel with 150ms debounce
    const timer = setTimeout(async () => {
      // If Google Places AutocompleteService is active, query it
      if (autocompleteServiceRef.current && window.google?.maps?.places) {
        try {
          autocompleteServiceRef.current.getPlacePredictions(
            { input: q },
            (predictions, status) => {
              if (requestId !== lastRequestIdRef.current) return;
              if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
                const results = predictions.map((p) => ({
                  placeId: p.place_id,
                  name: p.structured_formatting?.main_text || p.description,
                  mainText: p.structured_formatting?.main_text || p.description,
                  secondaryText: p.structured_formatting?.secondary_text || '',
                  formattedAddress: p.description,
                  source: 'GOOGLE_PLACES'
                }));
                // Merge instant + Google Places
                const existing = new Set(results.map((r) => r.name.toLowerCase()));
                const combined = [...results];
                for (const m of instantMatches) {
                  if (!existing.has(m.name.toLowerCase())) {
                    existing.add(m.name.toLowerCase());
                    combined.push(m);
                  }
                }
                setSearchResults(combined);
                setSearchStatus('results');
                return;
              }
              fallbackSearch(q, requestId, instantMatches);
            }
          );
          return;
        } catch (err) {}
      }

      fallbackSearch(q, requestId, instantMatches);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fallback search using Backend API & Geocoder
  const fallbackSearch = async (q, requestId, initialMatches = []) => {
    try {
      const res = await api.get(`/location/search?q=${encodeURIComponent(q)}`);
      if (requestId !== lastRequestIdRef.current) return;

      if (res.data?.success && Array.isArray(res.data.data)) {
        const backendItems = res.data.data;
        const qLow = q.toLowerCase();

        // Verify that backend returned genuine matches for the query
        const relevant = backendItems.filter((item) => {
          const name = (item.name || item.city || '').toLowerCase();
          const dist = (item.district || '').toLowerCase();
          const st = (item.state || '').toLowerCase();
          return name.includes(qLow) || qLow.includes(name) || dist.includes(qLow) || st.includes(qLow);
        });

        if (relevant.length > 0 || initialMatches.length > 0) {
          const parsed = relevant.map((item) => ({
            placeId: item.placeId || item._id || item.id,
            name: item.name || item.city,
            mainText: item.mainText || item.name || item.city,
            secondaryText: item.secondaryText || [item.city !== item.name ? item.city : '', item.state, item.country || 'India'].filter(Boolean).join(', '),
            city: item.city || item.name,
            locality: item.locality || item.name,
            district: item.district || '',
            state: item.state || '',
            country: item.country || 'India',
            latitude: item.latitude,
            longitude: item.longitude,
            type: item.type || 'CITY',
            source: item.source || 'BACKEND'
          }));

          // Merge initial matches + parsed
          const seen = new Set();
          const merged = [];
          for (const item of [...initialMatches, ...parsed]) {
            const key = `${item.name.toLowerCase()}_${(item.state || '').toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          }

          setSearchResults(merged);
          setSearchStatus('results');
          return;
        }
      }

      if (initialMatches.length > 0) {
        setSearchResults(initialMatches);
        setSearchStatus('results');
        return;
      }

      setSearchResults([]);
      setSearchStatus('no_results');
      setStatusMessage(`No locations found matching "${q}".`);
    } catch (err) {
      if (requestId !== lastRequestIdRef.current) return;
      if (initialMatches.length > 0) {
        setSearchResults(initialMatches);
        setSearchStatus('results');
      } else {
        setSearchResults([]);
        setSearchStatus('no_results');
        setStatusMessage(`No locations found matching "${q}".`);
      }
    }
  };

  // Resolve Real Coordinates and Place Details when Customer Clicks a Search Result
  const handleSelectLocation = useCallback((item) => {
    if (item.latitude != null && item.longitude != null) {
      const finalLoc = {
        name: item.city || item.name || 'Guntur',
        city: item.city || item.name || 'Guntur',
        locality: item.locality || item.name || 'Guntur',
        state: item.state || '',
        country: item.country || 'India',
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        formattedAddress: item.formattedAddress || `${item.name}, ${item.city || ''}`,
        source: item.source || 'MANUAL'
      };
      setManualLocation(finalLoc);
      if (onClose) onClose();
      return;
    }

    // Resolve Place ID to Real Coordinates using Google Geocoder
    if (item.placeId && geocoderRef.current) {
      geocoderRef.current.geocode({ placeId: item.placeId }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const r = results[0];
          const lat = r.geometry.location.lat();
          const lng = r.geometry.location.lng();

          let city = item.name || '';
          let locality = item.name || '';
          let state = '';
          let country = 'India';

          (r.address_components || []).forEach((comp) => {
            const types = comp.types || [];
            if (types.includes('locality')) city = comp.long_name;
            else if (types.includes('sublocality') || types.includes('neighborhood')) locality = comp.long_name;
            else if (types.includes('administrative_area_level_1')) state = comp.long_name;
            else if (types.includes('country')) country = comp.long_name;
          });

          const finalLoc = {
            name: city || locality || item.name,
            city: city || locality || item.name,
            locality: locality || city || item.name,
            state: state || item.secondaryText || '',
            country,
            latitude: lat,
            longitude: lng,
            formattedAddress: r.formatted_address || item.formattedAddress || item.description,
            placeId: item.placeId,
            source: 'GOOGLE_PLACES'
          };
          setManualLocation(finalLoc);
          if (onClose) onClose();
        } else {
          // Direct fallback if geocode fails
          const finalLoc = {
            name: item.name,
            city: item.name,
            locality: item.name,
            state: '',
            country: 'India',
            latitude: 16.3067,
            longitude: 80.4365,
            source: 'MANUAL'
          };
          setManualLocation(finalLoc);
          if (onClose) onClose();
        }
      });
      return;
    }

    // Default fallback
    const cityName = item.city || item.name || 'Guntur';
    setManualLocation({
      name: cityName,
      city: cityName,
      locality: item.locality || cityName,
      state: item.state || '',
      country: 'India',
      latitude: Number(item.latitude) || 16.3067,
      longitude: Number(item.longitude) || 80.4365,
      source: 'MANUAL'
    });
    if (onClose) onClose();
  }, [setManualLocation, onClose]);

  // Keyboard Navigation Support (Arrow Up, Arrow Down, Enter, Escape)
  const handleKeyDown = (e) => {
    if (searchStatus !== 'results' || searchResults.length === 0) {
      if (e.key === 'Escape' && onClose) onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelectLocation(searchResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchQuery('');
    }
  };

  const handleDetectGPS = () => {
    if (isGeoLoading) return;
    requestFreshGPS();
  };

  if (!isOpen) return null;

  const currentCityName = String(location?.city || location?.name || '');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflow: 'hidden'
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '85vh',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          position: 'relative',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem 1rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MapPin size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Select Location
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Find products available near you
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Real Google Places Search Box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search city, area or place (e.g. Hyderabad, Indiranagar)..."
              style={{
                width: '100%',
                padding: '12px 40px 12px 42px',
                borderRadius: '14px',
                border: '2px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                aria-label="Clear search query"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Use My Location Button */}
          {!searchQuery && (
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={isGeoLoading}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: '14px',
                backgroundColor: isGeoLoading ? '#f1f5f9' : '#ecfdf5',
                border: isGeoLoading ? '1.5px solid #cbd5e1' : '1.5px solid #a7f3d0',
                color: isGeoLoading ? '#64748b' : '#047857',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: isGeoLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
                boxShadow: isGeoLoading ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.08)'
              }}
            >
              {isGeoLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Detecting location...</span>
                </>
              ) : (
                <>
                  <Navigation size={18} color="#059669" />
                  <span>Use my current location</span>
                </>
              )}
            </button>
          )}

          {geoError && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#dc2626',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{geoError}</span>
            </div>
          )}

          {/* Real Google Maps & BookMyShow Places Search Results */}
          {searchQuery ? (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {searchStatus === 'searching' && searchResults.length === 0 && <RefreshCw size={13} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />}
                  <span>
                    {searchStatus === 'searching' && searchResults.length === 0 ? 'Searching locations...' : `Places matching "${searchQuery}"`}
                  </span>
                </div>
                {searchResults.length > 0 && (
                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>
                    {searchResults.length} {searchResults.length === 1 ? 'place' : 'places'}
                  </span>
                )}
              </div>

              {searchStatus === 'searching' && searchResults.length === 0 ? (
                <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <RefreshCw size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
                  <span>Searching places and areas...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {searchResults.map((item, idx) => {
                    const isKeyboardSelected = idx === selectedIndex;
                    const isCityType = item.type === 'CITY';
                    return (
                      <button
                        key={item.placeId || item._id || idx}
                        type="button"
                        onClick={() => handleSelectLocation(item)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          backgroundColor: isKeyboardSelected ? '#ecfdf5' : '#ffffff',
                          border: isKeyboardSelected ? '2px solid #10b981' : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                        className="location-result-row"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: isCityType ? '#eff6ff' : '#ecfdf5',
                              color: isCityType ? '#2563eb' : '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {isCityType ? <Building2 size={18} /> : <MapPin size={18} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.mainText || item.name}
                            </div>
                            {item.secondaryText && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.secondaryText}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {item.type && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#047857', backgroundColor: '#d1fae5', padding: '3px 7px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              {item.type}
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '8px' }}>
                            Select
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchStatus === 'no_results' ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  {statusMessage || `No locations found matching "${searchQuery}".`}
                </div>
              ) : searchStatus === 'error' ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626', fontSize: '0.85rem', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                  {statusMessage || 'Location search is currently unavailable.'}
                </div>
              ) : null}
            </div>
          ) : (
            /* Popular Locations Grid */
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Popular Locations
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                {popularCities.map((pop) => {
                  const popName = String(pop.name || pop.city || '');
                  const isSelected = Boolean(currentCityName && popName && currentCityName.toLowerCase() === popName.toLowerCase());
                  return (
                    <button
                      key={popName}
                      type="button"
                      onClick={() => handleSelectLocation(pop)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #10b981' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                        color: isSelected ? '#047857' : '#334155',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Building2 size={18} color={isSelected ? '#10b981' : '#64748b'} />
                      <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{popName}</span>
                      {isSelected && (
                        <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BookMyShowLocationModal;
