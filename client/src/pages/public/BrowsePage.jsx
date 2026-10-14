import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Sparkles,
  RefreshCw,
  AlertCircle,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
  Navigation,
  MapPin,
  Map as MapIcon,
  LayoutGrid,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { itemService } from '../../services/itemService';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { useLocationContext } from '../../context/LocationContext';
import { SORT_OPTIONS, DISTANCE_OPTIONS } from '../../constants/categories';

// Browse Subcomponents
import BrowseHeader from '../../components/browse/BrowseHeader';
import CategoryBar from '../../components/browse/CategoryBar';
import FilterPanel from '../../components/browse/FilterPanel';
import MobileFilterDrawer from '../../components/browse/MobileFilterDrawer';
import ActiveFilterChips from '../../components/browse/ActiveFilterChips';
import MapPreviewCard from '../../components/browse/MapPreviewCard';
import BrowseSkeleton from '../../components/browse/BrowseSkeleton';
const BrowseMap = React.lazy(() => import('../../components/browse/BrowseMap'));
import ItemCard from '../../components/common/ItemCard';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

export const BrowsePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location } = useLocationContext();

  // 1. Read Filter State from URL Query Parameters
  const searchQueryParam = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const subcategoryParam = searchParams.get('subcategory') || 'all';
  const sharingTypeParam = searchParams.get('sharingType') || 'all';
  const conditionParam = searchParams.get('condition') || 'all';
  const cityParam = searchParams.get('city') || '';
  const radiusParam = searchParams.get('radius') || searchParams.get('distance') || 'all';
  const sortParam = searchParams.get('sort') || 'newest';
  const latParam = searchParams.get('latitude') || '';
  const lonParam = searchParams.get('longitude') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Local state for search input to allow smooth debounced typing
  const [searchInput, setSearchInput] = useState(searchQueryParam);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Geolocation & View Mode State
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // API Data States - Instant zero-millisecond render from cache with Stale-While-Revalidate
  const [items, setItems] = useState(() => {
    const cachedBrowse = itemService.getCachedBrowseItems(searchParams.toString());
    if (cachedBrowse && cachedBrowse.items && cachedBrowse.items.length > 0) {
      return cachedBrowse.items.filter((i) => !itemService.isMockItem(i));
    }
    return itemService.getCachedItems(12);
  });
  const [similarAlternatives, setSimilarAlternatives] = useState([]);
  const [totalItems, setTotalItems] = useState(() => items.length || 0);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [totalPages, setTotalPages] = useState(() => Math.ceil(items.length / 12) || 1);
  const [loading, setLoading] = useState(() => items.length === 0);
  const [error, setError] = useState(null);

  // Load live category counts from database
  useEffect(() => {
    let isMounted = true;
    itemService
      .getCategories()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.categoryCounts) {
          setCategoryCounts(res.categoryCounts);
        } else if (res && Array.isArray(res.categories)) {
          const map = {};
          res.categories.forEach((c) => {
            if (c.id && typeof c.count === 'number') {
              map[c.id] = c.count;
            }
          });
          setCategoryCounts(map);
        }
      })
      .catch((err) => {
        console.warn('Failed to load category counts:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize local search input if URL search param changes externally (e.g. back/forward)
  useEffect(() => {
    if (searchQueryParam !== searchInput) {
      setSearchInput(searchQueryParam);
    }
  }, [searchQueryParam]);

  // Synchronize debounced search to URL query parameter
  useEffect(() => {
    const currentParam = searchParams.get('search') || '';
    if (debouncedSearch !== currentParam) {
      const nextParams = new URLSearchParams(searchParams);
      if (debouncedSearch.trim()) {
        nextParams.set('search', debouncedSearch.trim());
      } else {
        nextParams.delete('search');
      }
      nextParams.set('page', '1'); // Reset to page 1 on new search
      setSearchParams(nextParams, { replace: true });
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  // Helper to Update Query Parameters
  const updateFilterParam = useCallback(
    (key, value) => {
      const nextParams = new URLSearchParams(searchParams);
      if (!value || value === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
      nextParams.set('page', '1'); // Reset to page 1 on filter change
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams]
  );

  const handleClearAllFilters = useCallback(() => {
    setSearchInput('');
    setGeoError(null);
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const handleRemoveSingleFilter = useCallback(
    (key) => {
      if (key === 'search') {
        setSearchInput('');
        updateFilterParam('search', '');
      } else if (key === 'nearMe' || key === 'coordinates') {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('latitude');
        nextParams.delete('longitude');
        nextParams.set('page', '1');
        setSearchParams(nextParams);
      } else {
        updateFilterParam(key, 'all');
      }
    },
    [searchParams, setSearchParams, updateFilterParam]
  );

  // Geolocation "Near Me" Trigger (Only upon explicit user click)
  const handleNearMeClick = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Please search by city instead.');
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLocating(false);
        const { latitude, longitude } = position.coords;
        const nextParams = new URLSearchParams(searchParams);
        // Round to 3 decimal places (~100m) for privacy preservation
        nextParams.set('latitude', latitude.toFixed(3));
        nextParams.set('longitude', longitude.toFixed(3));
        nextParams.set('sort', 'nearest');
        nextParams.set('page', '1');
        setSearchParams(nextParams);
      },
      (err) => {
        setGeoLocating(false);
        console.warn('Geolocation error:', err.message);
        setGeoError(
          'Location access was denied or unavailable. You can search by city or locality instead.'
        );
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleClearNearMe = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('latitude');
    nextParams.delete('longitude');
    if (nextParams.get('sort') === 'nearest') {
      nextParams.set('sort', 'newest');
    }
    nextParams.set('page', '1');
    setSearchParams(nextParams);
    setGeoError(null);
  };

  // 3. Fetch Items through Real Backend Discovery API (Stale-While-Revalidate)
  const fetchItems = useCallback(async () => {
    // Only show full skeleton loader if we have NO items to display at all
    setItems((currentItems) => {
      if (!currentItems || currentItems.length === 0) {
        setLoading(true);
      }
      return currentItems;
    });
    setError(null);

    try {
      const response = await itemService.discoverItems({
        search: searchQueryParam,
        category: categoryParam,
        subcategory: subcategoryParam,
        sharingType: sharingTypeParam,
        condition: conditionParam,
        sort: sortParam,
        page: pageParam,
        limit: 12
      });

      if (response && Array.isArray(response.items)) {
        const clean = response.items.filter((i) => !itemService.isMockItem(i));
        setItems(clean);
        setTotalItems(response.total !== undefined ? response.total : clean.length);
        setTotalPages(response.totalPages || Math.ceil(clean.length / 12) || 1);
        if (clean.length > 0) {
          itemService.setCachedBrowseItems(searchParams.toString(), { ...response, items: clean });
        }
      }
    } catch (err) {
      console.warn('Silent browse background fetch notice:', err);
    } finally {
      setLoading(false);
    }
  }, [
    searchQueryParam,
    categoryParam,
    subcategoryParam,
    sharingTypeParam,
    conditionParam,
    cityParam,
    radiusParam,
    latParam,
    lonParam,
    location?.latitude,
    location?.longitude,
    sortParam,
    pageParam
  ]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Fetch similar products when main query returns 0 exact matches
  useEffect(() => {
    if (!loading && !error && items.length === 0) {
      itemService
        .getSimilarItems(null, {
          category: categoryParam !== 'all' ? categoryParam : undefined,
          sharingType: sharingTypeParam !== 'all' ? sharingTypeParam : undefined,
          limit: 8
        })
        .then((res) => {
          setSimilarAlternatives(Array.isArray(res) ? res : res?.items || []);
        })
        .catch(() => setSimilarAlternatives([]));
    }
  }, [loading, error, items.length, categoryParam, sharingTypeParam]);

  const hasCoordsActive = Boolean(latParam && lonParam);

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryParam !== 'all') count++;
    if (sharingTypeParam !== 'all') count++;
    if (conditionParam !== 'all') count++;
    if (cityParam && cityParam !== 'all') count++;
    if (radiusParam !== 'all' && radiusParam !== '25') count++;
    if (hasCoordsActive) count++;
    return count;
  }, [categoryParam, sharingTypeParam, conditionParam, cityParam, radiusParam, hasCoordsActive]);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', padding: '2.5rem 1.5rem 5rem 1.5rem' }}>
      {/* 1. Header & Discovery Banner */}
      <BrowseHeader
        userLocation={cityParam || user?.city || 'Local Community'}
        totalItems={totalItems}
      />

      {/* 2. Prominent Search & Near Me Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: '1000px'
          }}
        >
          {/* Main Search Input */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              flex: '1 1 320px',
              minWidth: '280px'
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '16px',
                color: 'var(--color-primary-600)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Search size={20} />
            </span>

            <input
              type="text"
              placeholder="What are you looking for? (e.g. Calculator, Textbooks, Tools, Headphones...)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 44px 13px 48px',
                fontSize: '1rem',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--color-slate-300)',
                backgroundColor: '#ffffff',
                color: 'var(--color-slate-900)',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                outline: 'none',
                transition: 'all var(--transition-fast)'
              }}
              className="browse-search-input"
              aria-label="Search items, keywords, categories"
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search input"
                style={{
                  position: 'absolute',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-slate-400)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '50%'
                }}
                className="clear-search-btn"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* "Near Me" Smart Geolocation Button */}
          <button
            type="button"
            onClick={hasCoordsActive ? handleClearNearMe : handleNearMeClick}
            disabled={geoLocating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '13px 20px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: hasCoordsActive ? '#059669' : '#ffffff',
              color: hasCoordsActive ? '#ffffff' : 'var(--color-slate-800)',
              border: hasCoordsActive ? '1.5px solid #059669' : '1.5px solid var(--color-slate-300)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: geoLocating ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
              transition: 'all var(--transition-fast)',
              flexShrink: 0
            }}
            title="Search items near your approximate current location"
          >
            <Navigation
              size={17}
              style={{
                transform: hasCoordsActive ? 'rotate(45deg)' : 'none',
                transition: 'transform 0.3s ease'
              }}
            />
            <span>
              {geoLocating ? 'Locating...' : hasCoordsActive ? 'Near Me (Active)' : 'Near Me'}
            </span>
            {hasCoordsActive && <X size={14} style={{ marginLeft: '4px' }} />}
          </button>
        </div>

        {/* Geolocation Feedback / Error Message */}
        {geoError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              color: '#b91c1c',
              fontSize: '0.85rem',
              maxWidth: '800px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{geoError}</span>
            <button
              type="button"
              onClick={() => setGeoError(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#b91c1c',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Active GPS Privacy Notice Banner */}
        {hasCoordsActive && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-md)',
              color: '#065f46',
              fontSize: '0.8rem',
              maxWidth: '800px'
            }}
          >
            <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0 }} />
            <span>
              Searching within <strong>{radiusParam} km</strong> of your approximate area. Your exact address is never stored or exposed.
            </span>
          </div>
        )}
      </div>

      {/* 3. Horizontal Category Shortcuts Row */}
      <CategoryBar
        selectedCategory={categoryParam}
        onSelectCategory={(catId) => updateFilterParam('category', catId)}
        categoryCounts={categoryCounts}
        totalItems={totalItems}
      />

      {/* 4. Controls Bar: Result Count, View Toggle, Mobile Filter & Sort */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid var(--color-slate-200)'
        }}
      >
        {/* Left: Result Count & Active Mobile Filter Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mobile Filter Drawer Button */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: activeFiltersCount > 0 ? '#ecfdf5' : '#ffffff',
              border: activeFiltersCount > 0 ? '1px solid #10b981' : '1px solid var(--color-slate-300)',
              color: activeFiltersCount > 0 ? '#047857' : 'var(--color-slate-700)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
            }}
            className="mobile-filter-btn"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#059669',
                  color: '#ffffff'
                }}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Results Summary Count */}
          <div style={{ fontSize: '0.925rem', color: 'var(--color-slate-600)', fontWeight: 500 }}>
            {loading ? (
              <span>Searching community listings...</span>
            ) : (
              <span>
                Showing <strong>{items.length}</strong> of <strong>{totalItems}</strong> items
                {hasCoordsActive && ` within ${radiusParam} km`}
              </span>
            )}
          </div>
        </div>

        {/* Right: View Mode Toggle & Sort Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Mode Switcher: Grid vs Map */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: 'var(--radius-md)',
              padding: '2px',
              border: '1px solid var(--color-slate-200)'
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#059669' : 'var(--color-slate-600)',
                fontWeight: viewMode === 'grid' ? 700 : 500,
                fontSize: '0.825rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
              title="View items as grid"
            >
              <LayoutGrid size={15} />
              <span>Grid</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('map')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: viewMode === 'map' ? '#ffffff' : 'transparent',
                color: viewMode === 'map' ? '#059669' : 'var(--color-slate-600)',
                fontWeight: viewMode === 'map' ? 700 : 500,
                fontSize: '0.825rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
              title="View items on interactive map"
            >
              <MapIcon size={15} />
              <span>Map</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label
              htmlFor="browse-sort"
              style={{
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--color-slate-500)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ArrowUpDown size={14} />
              <span>Sort:</span>
            </label>

            <select
              id="browse-sort"
              value={sortParam}
              onChange={(e) => updateFilterParam('sort', e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-slate-300)',
                backgroundColor: '#ffffff',
                color: 'var(--color-slate-800)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
              className="browse-sort-select"
            >
              <option value="relevant">Most Relevant</option>
              <option value="newest">Newest First</option>
              <option value="nearest">Nearest First</option>
              <option value="available_first">Available First</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Active Filter Chips */}
      <ActiveFilterChips
        filters={{
          search: searchQueryParam,
          category: categoryParam,
          sharingType: sharingTypeParam,
          condition: conditionParam,
          city: cityParam,
          distance: radiusParam !== '25' && radiusParam !== 'all' ? radiusParam : undefined,
          nearMe: hasCoordsActive ? `Near Me (${radiusParam} km)` : undefined
        }}
        onRemoveFilter={handleRemoveSingleFilter}
        onClearAll={handleClearAllFilters}
      />

      {/* 6. Main Content Split: Left Filters Sidebar + Right Grid / Map */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: '1.75rem',
          alignItems: 'start'
        }}
        className="browse-layout-grid"
      >
        {/* Desktop Filters Column */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'sticky',
            top: '80px'
          }}
          className="desktop-filter-sidebar"
        >
          <FilterPanel
            filters={{
              category: categoryParam,
              sharingType: sharingTypeParam,
              condition: conditionParam,
              city: cityParam,
              distance: radiusParam,
              availability: 'available'
            }}
            onFilterChange={(key, val) => {
              if (key === 'distance') {
                updateFilterParam('radius', val);
              } else {
                updateFilterParam(key, val);
              }
            }}
            onResetFilters={handleClearAllFilters}
            totalItems={totalItems}
            categoryCounts={categoryCounts}
            isMobile={false}
          />

          <MapPreviewCard
            centerLocation={cityParam || user?.city || 'Local Area'}
            radiusKm={radiusParam === 'all' ? 25 : parseInt(radiusParam, 10)}
            itemsCount={totalItems}
          />
        </aside>

        {/* Right: Items Grid / Map View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Loading Skeleton */}
          {loading && <BrowseSkeleton />}

          {/* Error State with Retry */}
          {!loading && error && (
            <div
              style={{
                padding: '3rem 2rem',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid #fee2e2',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: '#fef2f2',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertCircle size={28} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                Unable to load items right now
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-slate-600)', margin: 0, maxWidth: '440px' }}>
                {error}
              </p>
              <Button variant="secondary" size="md" iconLeft={RefreshCw} onClick={fetchItems}>
                Retry
              </Button>
            </div>
          )}

          {/* Empty State with Similar Products Engine Recommendations */}
          {!loading && !error && items.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <EmptyState
                icon={PackageOpen}
                title="No exact match found"
                description={
                  searchQueryParam
                    ? `No items directly matched "${searchQueryParam}". Try adjusting your keywords or clearing active filters.`
                    : "No listings matched your active filter criteria. Try clearing filters or expanding your search."
                }
                actionLabel="Clear All Filters"
                onAction={handleClearAllFilters}
              />

              {similarAlternatives.length > 0 && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-slate-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={18} color="#059669" />
                        <span>YOU MAY ALSO REUSE</span>
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', margin: '2px 0 0 0' }}>
                        Explore alternative useful items shared by community members
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClearAllFilters}>
                      Clear Filters & View All
                    </Button>
                  </div>

                  <div className="browse-items-grid">
                    {similarAlternatives.map((sItem, idx) => (
                      <ItemCard key={sItem.id || sItem._id || idx} item={sItem} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Interactive Map View */}
          {!loading && !error && items.length > 0 && viewMode === 'map' && (
            <React.Suspense fallback={<BrowseSkeleton />}>
              <BrowseMap
                items={items}
                userCoordinates={latParam && lonParam ? [parseFloat(latParam), parseFloat(lonParam)] : null}
                radiusKm={parseInt(radiusParam || '25', 10)}
                centerLocation={cityParam || 'Local Area'}
              />
            </React.Suspense>
          )}

          {/* Items Grid View */}
          {!loading && !error && items.length > 0 && viewMode === 'grid' && (
            <>
              <div className="browse-items-grid">
                {items.map((item, index) => (
                  <ItemCard
                    key={item.id || item._id || index}
                    item={item}
                    onSaveToggle={async (itemId) => {
                      await itemService.saveItem(itemId);
                    }}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid var(--color-slate-200)'
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageParam <= 1}
                    onClick={() => updateFilterParam('page', pageParam - 1)}
                    iconLeft={ChevronLeft}
                  >
                    Previous
                  </Button>

                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-600)', padding: '0 8px' }}>
                    Page {pageParam} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageParam >= totalPages}
                    onClick={() => updateFilterParam('page', pageParam + 1)}
                    iconRight={ChevronRight}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 7. Mobile Filter Drawer (Modal Sheet) */}
      <MobileFilterDrawer
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={{
          category: categoryParam,
          sharingType: sharingTypeParam,
          condition: conditionParam,
          city: cityParam,
          distance: radiusParam,
          availability: 'available'
        }}
        onFilterChange={(key, val) => {
          if (key === 'distance') {
            updateFilterParam('radius', val);
          } else {
            updateFilterParam(key, val);
          }
        }}
        onResetFilters={handleClearAllFilters}
        totalItems={totalItems}
      />

      <style>{`
        .browse-search-input:focus {
          border-color: var(--color-primary-500) !important;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.18) !important;
        }
        .clear-search-btn:hover {
          color: var(--color-slate-700);
        }
        .browse-sort-select:focus {
          border-color: var(--color-primary-500);
        }

        .browse-items-grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(4, 1fr);
        }

        @media (min-width: 1536px) {
          .browse-items-grid {
            grid-template-columns: repeat(5, 1fr) !important;
          }
        }
        @media (max-width: 1279px) {
          .browse-items-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 900px) {
          .browse-items-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 520px) {
          .browse-items-grid {
            grid-template-columns: repeat(1, 1fr) !important;
          }
        }

        @media (max-width: 1024px) {
          .browse-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .desktop-filter-sidebar {
            display: none !important;
          }
          .mobile-filter-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BrowsePage;
