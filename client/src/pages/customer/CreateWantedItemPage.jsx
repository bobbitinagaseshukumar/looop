import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  Sparkles,
  MapPin,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Upload,
  X,
  Send,
  Eye,
  Info,
  ShieldCheck,
  Tag,
  Layers,
  FileText
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { wantedService } from '../../services/wantedService';
import { itemService } from '../../services/itemService';
import { GoogleMapPicker } from '../../components/maps/GoogleMapPicker';
import { reverseGeocodeLocation } from '../../services/geocodingService';
import { mockCategories } from '../../data/mockData';

export const CreateWantedItemPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Categories & Subcategories State
  const [categoriesList, setCategoriesList] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [preferredSharingType, setPreferredSharingType] = useState('any');
  const [conditionPreference, setConditionPreference] = useState('any');

  // Location State
  const defaultCity = typeof user?.location === 'string'
    ? user.location.split(',')[0]?.trim()
    : user?.location?.city || 'Bengaluru';
  const defaultLocality = typeof user?.location === 'string'
    ? user.location.split(',')[1]?.trim()
    : user?.location?.locality || 'Indiranagar';

  const [city, setCity] = useState(defaultCity || 'Bengaluru');
  const [locality, setLocality] = useState(defaultLocality || 'Indiranagar');
  const [state, setState] = useState('Karnataka');
  const [coordinates, setCoordinates] = useState([12.9716, 77.5946]);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Urgency & Dates
  const [urgency, setUrgency] = useState('medium');
  const [requiredBy, setRequiredBy] = useState('');
  const [expiration, setExpiration] = useState('30 days');

  // Optional Reference Image State
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // Submission & Validation States
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 1. Load Categories from Backend API (Preferred endpoint: GET /api/categories)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const data = await itemService.getCategories();
        const list = data?.categories || data || mockCategories;
        setCategoriesList(list);
        if (list.length > 0 && !category) {
          setCategory(list[0].id || list[0].name.toLowerCase());
        }
      } catch (err) {
        console.warn('Could not load dynamic categories, falling back to catalog:', err);
        setCategoriesList(mockCategories);
        if (mockCategories.length > 0 && !category) {
          setCategory(mockCategories[0].id);
        }
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Update subcategories when category changes
  const activeCategoryObj = categoriesList.find(
    (c) => (c.id || c.name.toLowerCase()) === category.toLowerCase()
  );
  const availableSubcategories = activeCategoryObj?.subcategories || [
    'General',
    'Other'
  ];

  useEffect(() => {
    if (availableSubcategories.length > 0) {
      setSubcategory(availableSubcategories[0]);
    } else {
      setSubcategory('General');
    }
  }, [category]);

  // Mark form as dirty when fields change
  useEffect(() => {
    if (title || description || imagePreview) {
      setIsDirty(true);
    }
  }, [title, description, imagePreview]);

  // Draft protection: Warn before leaving page if dirty
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = 'Your wanted request has not been posted yet. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  // Optional "Use My Location" via browser Geolocation API
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      addToast({
        title: 'Geolocation Unavailable',
        message: 'Your browser does not support automatic location detection.',
        variant: 'info'
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const geo = await reverseGeocodeLocation(lat, lng);
          if (geo.city) setCity(geo.city);
          if (geo.locality) setLocality(geo.locality);
          if (geo.state) setState(geo.state);
          setGettingLocation(false);
          addToast({
            title: 'Location Updated',
            message: `Approximate neighborhood set to ${[geo.locality, geo.city].filter(Boolean).join(', ')}.`,
            variant: 'success'
          });
        } catch {
          setCity('Bengaluru');
          setLocality('Indiranagar');
          setGettingLocation(false);
        }
      },
      () => {
        setGettingLocation(false);
        addToast({
          title: 'Location Permission',
          message: 'Could not access GPS. You can manually enter your city and locality.',
          variant: 'info'
        });
      },
      { timeout: 8000 }
    );
  };

  // Optional Image Upload Handler
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: 'Image must be under 5MB.'
      }));
      return;
    }

    // Check type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: 'Please upload a JPG, PNG, or WEBP image.'
      }));
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.image;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  // Validate form before submission
  const validateForm = () => {
    const errs = {};

    if (!title.trim()) {
      errs.title = 'Please enter what you are looking for.';
    } else if (title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters.';
    } else if (title.trim().length > 120) {
      errs.title = 'Title cannot exceed 120 characters.';
    }

    if (!category) {
      errs.category = 'Please select a category.';
    }

    if (!description.trim()) {
      errs.description = 'Please describe what you need.';
    } else if (description.trim().length < 10) {
      errs.description = 'Description must be at least 10 characters so others understand your need.';
    } else if (description.trim().length > 2000) {
      errs.description = 'Description cannot exceed 2000 characters.';
    }

    const q = parseInt(quantity, 10);
    if (isNaN(q) || q < 1) {
      errs.quantity = 'Quantity must be at least 1.';
    }

    if (!city.trim()) {
      errs.city = 'Please enter your city/region.';
    }

    // Required by date validation
    if (requiredBy) {
      const selected = new Date(requiredBy);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        errs.requiredBy = 'The required-by date cannot be in the past.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler -> calls real backend POST /api/wanted
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`input-${firstErrorKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate expiration date
      let expiresAtDate = null;
      const now = new Date();
      if (expiration === '7 days') {
        expiresAtDate = new Date(now.setDate(now.getDate() + 7));
      } else if (expiration === '14 days') {
        expiresAtDate = new Date(now.setDate(now.getDate() + 14));
      } else if (expiration === '30 days') {
        expiresAtDate = new Date(now.setDate(now.getDate() + 30));
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: category.toLowerCase().trim(),
        subcategory: subcategory ? subcategory.trim() : 'General',
        quantity: parseInt(quantity, 10) || 1,
        preferredSharingType,
        conditionPreference,
        location: {
          city: city.trim(),
          locality: locality.trim(),
          state: state.trim(),
          approximateAddress: `${locality ? locality + ', ' : ''}${city.trim()}`
        },
        urgency,
        requiredBy: requiredBy ? new Date(requiredBy).toISOString() : null,
        expiresAt: expiresAtDate ? expiresAtDate.toISOString() : null,
        expiration,
        images: imagePreview ? [{ url: imagePreview, caption: 'Reference Image' }] : []
      };

      const result = await wantedService.createWantedItem(payload);

      if (result && result.success && result.wantedItem) {
        setIsDirty(false);
        addToast({
          title: 'Wanted Item Posted!',
          message: 'Your wanted item has been posted to the LOOOP community.',
          variant: 'success'
        });

        const createdId = result.wantedItem.id || result.wantedItem._id;
        navigate(`/wanted/${createdId}`);
      } else {
        throw new Error(result?.message || 'Unable to post wanted item.');
      }
    } catch (err) {
      console.error('Failed to post wanted item:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "We couldn't post your request right now. Please check your network and try again.";
      setServerError(errMsg);
      addToast({
        title: 'Submission Failed',
        message: errMsg,
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preferred sharing type option descriptions
  const sharingTypeOptions = [
    { value: 'any', label: 'Any', desc: 'Open to any suitable sharing option' },
    { value: 'free', label: 'Free', desc: 'Looking for free handover' },
    { value: 'give_away', label: 'Give Away', desc: 'Permanent gift from someone moving or decluttering' },
    { value: 'borrow', label: 'Borrow', desc: 'Only need the item temporarily' },
    { value: 'exchange', label: 'Exchange', desc: 'Can offer another item in return' }
  ];

  // Condition options
  const conditionOptions = [
    { value: 'any', label: 'Any Condition', desc: 'Any functional state' },
    { value: 'new', label: 'New', desc: 'Brand new / unopened' },
    { value: 'like_new', label: 'Like New', desc: 'Minimal signs of wear' },
    { value: 'good', label: 'Good or Better', desc: 'Normal wear, perfectly working' },
    { value: 'fair', label: 'Fair', desc: 'Visible wear is fine' },
    { value: 'needs_repair', label: 'Needs Repair', desc: 'Willing to repair or fix minor issues' }
  ];

  // Urgency options
  const urgencyOptions = [
    { value: 'low', label: 'Low', desc: 'I need it eventually' },
    { value: 'medium', label: 'Medium', desc: 'I would like to find it soon' },
    { value: 'high', label: 'High', desc: 'I need it as soon as possible' }
  ];

  const getUrgencyBadgeVariant = (val) => {
    switch (val) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'info';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* 1. Page Header & Back Navigation */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          to="/wanted"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-slate-600)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '1rem',
            transition: 'color 0.15s ease'
          }}
          className="back-wanted-link"
        >
          <ArrowLeft size={16} />
          <span>Back to Wanted Items</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 2.8vw, 2.25rem)',
              fontWeight: 900,
              color: 'var(--color-slate-900)',
              margin: 0,
              letterSpacing: '-0.025em'
            }}
          >
            Post a Wanted Item
          </h1>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#047857',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)'
            }}
          >
            <Sparkles size={13} />
            <span>Community Request</span>
          </span>
        </div>

        <p style={{ color: 'var(--color-slate-600)', fontSize: '1rem', margin: 0 }}>
          Tell the LOOOP community what you need. Someone nearby may already have it.
        </p>
      </div>

      {/* Global Server Error Alert */}
      {serverError && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-danger-bg, #fef2f2)',
            border: '1px solid var(--color-danger-border, #fecaca)',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '2rem'
          }}
          role="alert"
        >
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>Could not post request</div>
            <div style={{ fontSize: '0.9rem' }}>{serverError}</div>
          </div>
        </div>
      )}

      {/* 2. Responsive Main Two-Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)',
          gap: '2.5rem',
          alignItems: 'start'
        }}
        className="create-wanted-grid"
      >
        {/* LEFT COLUMN: Main Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* SECTION 1: What are you looking for? */}
          <Card style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.75rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                1
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                What are you looking for?
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Title */}
              <Input
                label="Item Title"
                id="input-title"
                name="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: null }));
                }}
                placeholder="What are you looking for? (e.g. Scientific Calculator, Drill Machine, Study Desk)"
                maxLength={120}
                required
                error={errors.title}
                helperText="Be specific about the item so neighbors know what you need."
              />

              {/* Category & Subcategory Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <Select
                  label="Category"
                  id="input-category"
                  name="category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (errors.category) setErrors((prev) => ({ ...prev, category: null }));
                  }}
                  required
                  error={errors.category}
                  options={categoriesList.map((c) => ({
                    value: c.id || c.name.toLowerCase(),
                    label: c.name
                  }))}
                  disabled={loadingCategories}
                />

                <Select
                  label="Subcategory"
                  id="input-subcategory"
                  name="subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  options={availableSubcategories.map((sub) => ({
                    value: sub,
                    label: sub
                  }))}
                />
              </div>
            </div>
          </Card>

          {/* SECTION 2: Describe what you need */}
          <Card style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.75rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                2
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                Describe what you need
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Textarea
                label="Description"
                id="input-description"
                name="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: null }));
                }}
                rows={5}
                maxLength={2000}
                required
                error={errors.description}
                placeholder="Explain why you need it and mention any important requirements (e.g. I need a scientific calculator for my semester examinations. A basic programmable or non-programmable model is fine)."
                helperText="Explain why you need it and mention any important requirements."
              />

              <div style={{ maxWidth: '180px' }}>
                <Input
                  label="Quantity Needed"
                  id="input-quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  max={999}
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1));
                    if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: null }));
                  }}
                  required
                  error={errors.quantity}
                />
              </div>
            </div>
          </Card>

          {/* SECTION 3: Sharing preference & Condition */}
          <Card style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.75rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                3
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                Sharing Preference & Condition
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Preferred Sharing Type */}
              <div>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Preferred Sharing Type <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                  {sharingTypeOptions.map((opt) => {
                    const isSelected = preferredSharingType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPreferredSharingType(opt.value)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--color-primary-600)' : '1px solid var(--color-slate-200)',
                          backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isSelected ? 'var(--color-primary-800)' : 'var(--color-slate-800)' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: isSelected ? 'var(--color-primary-700)' : 'var(--color-slate-500)', lineHeight: 1.3, marginTop: '2px' }}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Condition Preference */}
              <div>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Minimum Acceptable Condition <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                  {conditionOptions.map((opt) => {
                    const isSelected = conditionPreference === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setConditionPreference(opt.value)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--color-primary-600)' : '1px solid var(--color-slate-200)',
                          backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isSelected ? 'var(--color-primary-800)' : 'var(--color-slate-800)' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: isSelected ? 'var(--color-primary-700)' : 'var(--color-slate-500)', lineHeight: 1.3, marginTop: '2px' }}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* SECTION 4: Location */}
          <Card style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                  4
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                  Location
                </h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconLeft={MapPin}
                onClick={handleUseMyLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? 'Detecting...' : 'Use My Location'}
              </Button>
            </div>

            {/* Privacy Reassurance Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--color-slate-200)',
                fontSize: '0.85rem',
                color: 'var(--color-slate-600)',
                marginBottom: '1.25rem'
              }}
            >
              <ShieldCheck size={16} color="var(--color-primary-600)" style={{ flexShrink: 0 }} />
              <span>Your exact address will not be publicly displayed. Community matching uses your approximate neighborhood.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <GoogleMapPicker
                initialCoordinates={coordinates}
                initialLocality={locality}
                initialCity={city}
                onChange={({ coordinates: newCoords, locality: newLoc, city: newCity }) => {
                  setCoordinates(newCoords);
                  if (newLoc) setLocality(newLoc);
                  if (newCity) setCity(newCity);
                }}
              />
            </div>
          </Card>

          {/* SECTION 5: Urgency & Availability */}
          <Card style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.75rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                5
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                Urgency & Timing
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Urgency */}
              <div>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
                  How urgently do you need this? <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                  {urgencyOptions.map((opt) => {
                    const isSelected = urgency === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setUrgency(opt.value)}
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--color-primary-600)' : '1px solid var(--color-slate-200)',
                          backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? 'var(--color-primary-800)' : 'var(--color-slate-800)' }}>
                            {opt.label}
                          </span>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: opt.value === 'high' ? '#ef4444' : opt.value === 'medium' ? '#f59e0b' : '#3b82f6'
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: isSelected ? 'var(--color-primary-700)' : 'var(--color-slate-500)' }}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <Input
                  label="Required By (Optional)"
                  id="input-requiredBy"
                  name="requiredBy"
                  type="date"
                  value={requiredBy}
                  onChange={(e) => {
                    setRequiredBy(e.target.value);
                    if (errors.requiredBy) setErrors((prev) => ({ ...prev, requiredBy: null }));
                  }}
                  error={errors.requiredBy}
                  helperText="When do you need the item by?"
                />

                <Select
                  label="Keep Request Active For"
                  id="input-expiration"
                  name="expiration"
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  options={[
                    { value: '7 days', label: '7 days' },
                    { value: '14 days', label: '14 days' },
                    { value: '30 days', label: '30 days' },
                    { value: 'Custom', label: 'Keep active until fulfilled' }
                  ]}
                  helperText="Request automatically closes after this duration."
                />
              </div>
            </div>
          </Card>

          {/* SECTION 6: Optional Reference Image */}
          <Card style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.75rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                6
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                Optional Reference Photo
              </h2>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', margin: '0 0 1rem 0' }}>
              Add a reference image if it helps neighbors identify the specific model, charger tip, or book edition you need.
            </p>

            {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-slate-200)', maxHeight: '200px' }}>
                <img
                  src={imagePreview}
                  alt="Wanted reference preview"
                  style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'cover', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  aria-label="Remove uploaded image"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                style={{
                  border: '2px dashed var(--color-slate-300)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                className="upload-dropzone"
              >
                <input
                  type="file"
                  id="wanted-image-input"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleImageChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <Upload size={24} color="var(--color-slate-400)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
                  Click to upload a reference photo
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginTop: '4px' }}>
                  Supports PNG, JPG, or WEBP (Max 5MB)
                </div>
              </div>
            )}
            {errors.image && (
              <span className="input-error-msg" style={{ marginTop: '6px', display: 'block' }}>
                {errors.image}
              </span>
            )}
          </Card>

          {/* SECTION 7: Review & Publish Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              paddingTop: '1rem',
              borderTop: '1px solid var(--color-slate-200)'
            }}
          >
            <Link to="/wanted" style={{ textDecoration: 'none' }}>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting}
              iconRight={Send}
            >
              {isSubmitting ? 'Posting Request...' : 'Post Wanted Item'}
            </Button>
          </div>
        </form>

        {/* RIGHT COLUMN: Live Preview & Reassurance Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', position: 'sticky', top: '90px' }} className="preview-sticky-pane">
          {/* Card 1: Live Preview Card */}
          <Card style={{ padding: '1.5rem', border: '1.5px solid var(--color-primary-200)', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} color="var(--color-primary-600)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-slate-700)' }}>
                  Live Preview
                </span>
              </div>
              <Badge variant={getUrgencyBadgeVariant(urgency)}>
                {urgency.toUpperCase()} URGENCY
              </Badge>
            </div>

            {/* Optional Image in Preview */}
            {imagePreview && (
              <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '1rem', maxHeight: '160px', backgroundColor: 'var(--color-slate-100)' }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
              </div>
            )}

            {/* Category & Subcategory Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-700)', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: 'var(--radius-xs)', textTransform: 'capitalize' }}>
                {category || 'Category'}
              </span>
              {subcategory && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                  • {subcategory}
                </span>
              )}
              {quantity > 1 && (
                <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: 'var(--radius-xs)', fontWeight: 600 }}>
                  Qty: {quantity}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: '0 0 8px 0', lineHeight: 1.3 }}>
              {title.trim() || 'What are you looking for?'}
            </h3>

            {/* Description Snippet */}
            <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', margin: '0 0 1rem 0', lineHeight: 1.5, maxHeight: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {description.trim() || 'Your description will appear here as you type...'}
            </p>

            {/* Preference Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.72rem', backgroundColor: '#f8fafc', border: '1px solid var(--color-slate-200)', padding: '3px 8px', borderRadius: 'var(--radius-full)', color: 'var(--color-slate-700)', fontWeight: 600 }}>
                Prefers: {preferredSharingType.toUpperCase().replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.72rem', backgroundColor: '#f8fafc', border: '1px solid var(--color-slate-200)', padding: '3px 8px', borderRadius: 'var(--radius-full)', color: 'var(--color-slate-700)', fontWeight: 600 }}>
                Condition: {conditionPreference.toUpperCase().replace('_', ' ')}
              </span>
            </div>

            {/* Approximate Location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-slate-600)', marginBottom: '1rem' }}>
              <MapPin size={14} color="var(--color-primary-600)" />
              <span>Near {locality ? `${locality}, ` : ''}{city || 'Bengaluru'}</span>
            </div>

            {/* Dates in Preview */}
            {(requiredBy || expiration) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-slate-500)', paddingTop: '0.75rem', borderTop: '1px dashed var(--color-slate-200)', marginBottom: '1rem' }}>
                {requiredBy && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    <span>Needed by {new Date(requiredBy).toLocaleDateString()}</span>
                  </span>
                )}
                {expiration && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>Active for {expiration}</span>
                  </span>
                )}
              </div>
            )}

            {/* Requester Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '0.75rem', borderTop: '1px solid var(--color-slate-100)' }}>
              <Avatar
                src={user?.avatar}
                name={user?.name || 'Requester'}
                size="sm"
              />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
                  {user?.name || 'Community Member'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-primary-700)', fontWeight: 600 }}>
                  {user?.trustScore || 98}% Verified Trust Score
                </div>
              </div>
            </div>

            <div style={{ marginTop: '0.85rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-slate-400)' }}>
              Live preview only. Your request will be discoverable once published.
            </div>
          </Card>

          {/* Card 2: Reassurance Panel "How LOOOP Works" */}
          <Card style={{ padding: '1.5rem', backgroundColor: '#f8fafc' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-slate-800)', margin: '0 0 0.85rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={16} color="var(--color-primary-600)" />
              <span>How LOOOP Works</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.825rem', color: 'var(--color-slate-600)', lineHeight: 1.5 }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                  1
                </span>
                <span><strong>Tell the community what you need.</strong> Post clear requirements so neighbors understand.</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                  2
                </span>
                <span><strong>Nearby users discover your request.</strong> Community members browsing wanted items see your listing.</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                  3
                </span>
                <span><strong>Someone with an unused item offers help.</strong> You get notified when an item is offered.</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                  4
                </span>
                <span><strong>Review and accept.</strong> Handover is completed safely using 4-digit verification codes.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .create-wanted-grid {
            grid-template-columns: 1fr !important;
          }
          .preview-sticky-pane {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CreateWantedItemPage;
