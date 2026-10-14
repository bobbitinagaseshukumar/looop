import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Gift,
  Clock,
  Repeat,
  HeartHandshake,
  MapPin,
  Compass,
  AlertTriangle,
  Check,
  Info,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Edit3,
  Layers,
  Send,
  HelpCircle
} from 'lucide-react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import ProductMediaUploader from '../../components/upload/ProductMediaUploader';
import { GoogleMapPicker } from '../../components/maps/GoogleMapPicker';
import { reverseGeocodeLocation } from '../../services/geocodingService';
import { LiveListingPreview } from '../../components/share/LiveListingPreview';
import { PublishSuccessState } from '../../components/share/PublishSuccessState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { itemService } from '../../services/itemService';
import { CATEGORIES, SUBCATEGORIES_MAP, SHARING_TYPES, CONDITIONS } from '../../constants/categories';

const DRAFT_STORAGE_KEY = 'looop_listing_draft';

const STEPS = [
  { id: 1, title: 'Item Basics', desc: 'Title & Category' },
  { id: 2, title: 'Add Photos', desc: 'Upload Images' },
  { id: 3, title: 'Sharing Type', desc: 'Free, Borrow, etc.' },
  { id: 4, title: 'Item Details', desc: 'Condition & Description' },
  { id: 5, title: 'Location', desc: 'City & Map' },
  { id: 6, title: 'Availability', desc: 'Rules & Status' },
  { id: 7, title: 'Review & Publish', desc: 'Summary & Publish' }
];

export const ShareItemPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, token } = useAuth();
  const { addToast } = useToast();

  // Enforce Authentication
  useEffect(() => {
    // If not authenticated and no token stored, redirect to login with return path
    if (!isAuthenticated && !user && !token && !localStorage.getItem('looop_token')) {
      addToast({
        title: 'Authentication Required',
        message: 'Please sign in to share an item with the LOOOP community.',
        variant: 'info'
      });
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [isAuthenticated, user, token, navigate, location.pathname, addToast]);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('books');
  const [subcategory, setSubcategory] = useState('Engineering');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [images, setImages] = useState([]);
  const [sharingType, setSharingType] = useState('give_away');
  const [borrowDuration, setBorrowDuration] = useState('14');
  const [borrowDurationUnit, setBorrowDurationUnit] = useState('days');
  const [borrowNotes, setBorrowNotes] = useState('');
  const [exchangeWishlist, setExchangeWishlist] = useState('');
  const [condition, setCondition] = useState('good');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [locality, setLocality] = useState('Indiranagar');
  const [coordinates, setCoordinates] = useState([12.9716, 77.5946]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [availability, setAvailability] = useState('Available');
  const [optionalYear, setOptionalYear] = useState('');
  const [optionalColor, setOptionalColor] = useState('');
  const [contactPhone, setContactPhone] = useState(() => user?.phone || '');

  useEffect(() => {
    if (user?.phone && !contactPhone) {
      setContactPhone(user.phone);
    }
  }, [user?.phone]);

  // Multi-Step & Validation State
  const [currentStep, setCurrentStep] = useState(1);
  const [formStatus, setFormStatus] = useState('idle'); // idle | submitting | success | error
  const [createdItem, setCreatedItem] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form ref for scrolling to errors
  const formTopRef = useRef(null);

  // Check for saved local draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title || parsed.description || (parsed.images && parsed.images.length > 0)) {
          setDraftAvailable(true);
        }
      }
    } catch {
      // Ignore draft read errors
    }
  }, []);

  // Update dynamic subcategories when category changes
  useEffect(() => {
    const subs = SUBCATEGORIES_MAP[category] || ['General', 'Other'];
    if (!subs.includes(subcategory)) {
      setSubcategory(subs[0]);
    }
  }, [category, subcategory]);

  // Track if form is dirty for unsaved changes protection
  useEffect(() => {
    if (title || description || images.length > 0 || brand || model) {
      setIsDirty(true);
      // Auto-save non-sensitive draft to localStorage
      try {
        const draftPayload = {
          title,
          category,
          subcategory,
          brand,
          model,
          sharingType,
          borrowDuration,
          borrowDurationUnit,
          borrowNotes,
          exchangeWishlist,
          condition,
          description,
          city,
          locality,
          images: images.slice(0, 3) // store up to 3 previews safely
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
      } catch {
        // quota exceeded or storage disabled
      }
    }
  }, [
    title,
    category,
    subcategory,
    brand,
    model,
    sharingType,
    borrowDuration,
    borrowDurationUnit,
    borrowNotes,
    exchangeWishlist,
    condition,
    description,
    city,
    locality,
    images
  ]);

  // Warn before browser window unload if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && formStatus !== 'success') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, formStatus]);

  // Step Validation Helper
  const validateStep = (step) => {
    if (step === 1) {
      setTouched((prev) => ({ ...prev, title: true }));
      const isTitleValid = validateField('title', title);
      if (!isTitleValid) {
        addToast({
          title: 'Item Title Required',
          message: 'Please enter a clear title for your item (min 3 characters).',
          variant: 'danger'
        });
        return false;
      }
      return true;
    }
    if (step === 2) {
      setTouched((prev) => ({ ...prev, images: true }));
      if (images.length === 0) {
        addToast({
          title: 'No Photos Added',
          message: 'Adding at least one photo helps your item get discovered faster.',
          variant: 'info'
        });
      }
      return true;
    }
    if (step === 3) {
      return true;
    }
    if (step === 4) {
      setTouched((prev) => ({ ...prev, description: true }));
      const isDescValid = validateField('description', description);
      if (!isDescValid) {
        addToast({
          title: 'Description Required',
          message: 'Please write a description (min 10 characters) about your item.',
          variant: 'danger'
        });
        return false;
      }
      return true;
    }
    if (step === 5) {
      setTouched((prev) => ({ ...prev, city: true }));
      const isCityValid = validateField('city', city);
      if (!isCityValid) {
        addToast({
          title: 'City Required',
          message: 'Please specify your city or region.',
          variant: 'danger'
        });
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      setTimeout(() => {
        formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const goToStep = (targetStep) => {
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      setTimeout(() => {
        formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (targetStep > currentStep) {
      for (let s = currentStep; s < targetStep; s++) {
        if (!validateStep(s)) return;
      }
      setCurrentStep(targetStep);
      setTimeout(() => {
        formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  // Load Saved Draft
  const handleLoadDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d.title) setTitle(d.title);
        if (d.category) setCategory(d.category);
        if (d.subcategory) setSubcategory(d.subcategory);
        if (d.brand) setBrand(d.brand);
        if (d.model) setModel(d.model);
        if (d.sharingType) setSharingType(d.sharingType);
        if (d.borrowDuration) setBorrowDuration(d.borrowDuration);
        if (d.borrowDurationUnit) setBorrowDurationUnit(d.borrowDurationUnit);
        if (d.borrowNotes) setBorrowNotes(d.borrowNotes);
        if (d.exchangeWishlist) setExchangeWishlist(d.exchangeWishlist);
        if (d.condition) setCondition(d.condition);
        if (d.description) setDescription(d.description);
        if (d.city) setCity(d.city);
        if (d.locality) setLocality(d.locality);
        if (d.images && Array.isArray(d.images)) setImages(d.images);
        setDraftAvailable(false);
        addToast({
          title: 'Draft Restored',
          message: 'Your previously saved listing details have been loaded.',
          variant: 'info'
        });
      }
    } catch {
      setDraftAvailable(false);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftAvailable(false);
    addToast({
      title: 'Draft Cleared',
      message: 'Saved listing draft has been removed.',
      variant: 'secondary'
    });
  };

  // Field Validation
  const validateField = (field, value) => {
    let errorMsg = '';
    if (field === 'title') {
      if (!value || !value.trim()) {
        errorMsg = 'Please enter an item title.';
      } else if (value.trim().length < 3) {
        errorMsg = 'Item title should be at least 3 characters.';
      } else if (value.trim().length > 100) {
        errorMsg = 'Title cannot exceed 100 characters.';
      }
    }
    if (field === 'description') {
      if (!value || !value.trim()) {
        errorMsg = 'Please add a description to help neighbors understand your item.';
      } else if (value.trim().length < 10) {
        errorMsg = 'Description should be at least 10 characters long.';
      }
    }
    if (field === 'city') {
      if (!value || !value.trim()) {
        errorMsg = 'Please specify your city or region.';
      }
    }
    if (field === 'images') {
      if (!value || value.length === 0) {
        errorMsg = 'Please add at least one photo of the item.';
      }
    }

    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    return !errorMsg;
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  // Use My Location Helper (without forcing permission)
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      addToast({
        title: 'Geolocation Unavailable',
        message: 'Your browser does not support automatic location. You can select your city manually.',
        variant: 'info'
      });
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoordinates([lat, lng]);

          // Reverse geocode to auto-update city and locality in text areas
          const geo = await reverseGeocodeLocation(lat, lng);
          if (geo.city) {
            setCity(geo.city);
            if (touched.city) validateField('city', geo.city);
          }
          if (geo.locality) {
            setLocality(geo.locality);
          }

          setDetectingLocation(false);
          addToast({
            title: 'Location Detected',
            message: `Approximate neighborhood set to ${[geo.locality, geo.city].filter(Boolean).join(', ')}.`,
            variant: 'success'
          });
        } catch {
          setDetectingLocation(false);
          addToast({
            title: 'Location Detected',
            message: 'Approximate coordinates updated securely.',
            variant: 'success'
          });
        }
      },
      (err) => {
        setDetectingLocation(false);
        addToast({
          title: 'Location Permission Skipped',
          message: 'Using manual city selection. Your approximate location remains active.',
          variant: 'secondary'
        });
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all as touched
    setTouched({
      title: true,
      description: true,
      city: true,
      images: true
    });

    // Run all validations
    const isTitleValid = validateField('title', title);
    const isDescValid = validateField('description', description);
    const isCityValid = validateField('city', city);
    const isImagesValid = validateField('images', images);

    if (!isTitleValid || !isDescValid || !isCityValid || !isImagesValid) {
      addToast({
        title: 'Please check your listing details',
        message: 'Fill in the required fields marked with friendly warnings.',
        variant: 'danger'
      });
      if (!isTitleValid) setCurrentStep(1);
      else if (!isImagesValid) setCurrentStep(2);
      else if (!isDescValid) setCurrentStep(4);
      else if (!isCityValid) setCurrentStep(5);
      formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setFormStatus('submitting');

    try {
      const fullLocationString = locality ? `${locality}, ${city}` : city;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        subcategory,
        brand: brand.trim(),
        model: model.trim(),
        images,
        sharingType,
        condition,
        phone: contactPhone.trim(),
        location: {
          city: city.trim(),
          locality: locality.trim(),
          approximateAddress: fullLocationString
        },
        coordinates: [coordinates[1], coordinates[0]], // [longitude, latitude] GeoJSON standard
        availability,
        optionalDetails: {
          year: optionalYear,
          color: optionalColor
        }
      };

      // Only attach sharing-type specific fields
      if (sharingType === 'borrow') {
        payload.borrowSettings = {
          maxDurationDays: parseInt(borrowDuration, 10) || 14,
          maxDurationUnit: borrowDurationUnit,
          notes: borrowNotes.trim()
        };
      } else if (sharingType === 'exchange') {
        payload.exchangeDetails = {
          wantedItems: exchangeWishlist.trim()
        };
      }

      const response = await itemService.createItem(payload);

      if (response && response.success) {
        // Clear local draft upon confirmed creation
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setIsDirty(false);
        setCreatedItem(response.item);
        setFormStatus('success');

        addToast({
          title: 'Listing Published!',
          message: `"${title.trim()}" is now live and discoverable in the community.`,
          variant: 'success'
        });
      } else {
        setFormStatus('error');
      }
    } catch (err) {
      console.error('Publish item error:', err);
      setFormStatus('error');
      addToast({
        title: 'Could Not Publish',
        message: 'We couldn’t publish your item right now. Please try again.',
        variant: 'danger'
      });
    }
  };

  const handleShareAnother = () => {
    setTitle('');
    setDescription('');
    setBrand('');
    setModel('');
    setImages([]);
    setBorrowNotes('');
    setExchangeWishlist('');
    setFormStatus('idle');
    setCreatedItem(null);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If successfully published, render polished success view with real returned ID
  if (formStatus === 'success' && createdItem) {
    return <PublishSuccessState item={createdItem} onShareAnother={handleShareAnother} />;
  }

  const currentCategoryObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const subcategoryList = SUBCATEGORIES_MAP[category] || ['General', 'Other'];

  return (
    <div
      ref={formTopRef}
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        padding: '0 clamp(0.75rem, 2.5vw, 1.25rem)'
      }}
    >
      {/* 1. COMPACT PAGE HEADER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
          <Badge variant="success">Share &amp; Reuse</Badge>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', fontWeight: 600 }}>
            Community Listing Flow
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-slate-900)', lineHeight: 1.2 }}>
          Share an Item
        </h1>
        <p style={{ color: 'var(--color-slate-600)', fontSize: '0.925rem', marginTop: '0.25rem' }}>
          Give something useful a second life in your community.
        </p>

        {/* Small Trust-Oriented Message */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '0.65rem',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            fontSize: '0.78rem',
            color: '#065f46',
            fontWeight: 600
          }}
        >
          <ShieldCheck size={14} color="#059669" />
          <span>Step-by-step form: Fill out each slide and click Next to proceed cleanly.</span>
        </div>
      </div>

      {/* Draft Resume Banner */}
      {draftAvailable && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#0369a1' }}>
            <RotateCcw size={16} color="#0284c7" />
            <span>You have an unfinished listing draft saved on this browser.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button size="sm" variant="outline" onClick={handleDiscardDraft}>
              Discard
            </Button>
            <Button size="sm" variant="primary" onClick={handleLoadDraft}>
              Resume Draft
            </Button>
          </div>
        </div>
      )}

      {/* Submission Error Banner */}
      {formStatus === 'error' && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              We couldn’t publish your item right now. Your entered data is preserved.
            </span>
          </div>
          <Button size="sm" variant="primary" onClick={handleSubmit}>
            Try Again
          </Button>
        </div>
      )}

      {/* MULTI-STEP WIZARD PROGRESS HEADER */}
      <div
        style={{
          marginBottom: '1.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--color-slate-200)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.15rem 1.35rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Step {currentStep} of {STEPS.length}
            </span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: '2px 0 0 0' }}>
              {STEPS[currentStep - 1].title} — <span style={{ fontWeight: 500, fontSize: '0.925rem', color: 'var(--color-slate-500)' }}>{STEPS[currentStep - 1].desc}</span>
            </h2>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
            {Math.round((currentStep / STEPS.length) * 100)}% Done
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--color-slate-100)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.85rem' }}>
          <div
            style={{
              height: '100%',
              width: `${(currentStep / STEPS.length) * 100}%`,
              backgroundColor: '#059669',
              borderRadius: '999px',
              transition: 'width 0.3s ease-in-out'
            }}
          />
        </div>

        {/* Step Navigation Pills */}
        <div
          className="step-pills-scroll"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px'
          }}
        >
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 600,
                  border: isActive
                    ? '2px solid #059669'
                    : isCompleted
                    ? '1px solid #a7f3d0'
                    : '1px solid var(--color-slate-200)',
                  backgroundColor: isActive
                    ? '#ecfdf5'
                    : isCompleted
                    ? '#f0fdf4'
                    : '#ffffff',
                  color: isActive
                    ? '#047857'
                    : isCompleted
                    ? '#065f46'
                    : 'var(--color-slate-600)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isActive
                      ? '#059669'
                      : isCompleted
                      ? '#10b981'
                      : 'var(--color-slate-200)',
                    color: isActive || isCompleted ? '#ffffff' : 'var(--color-slate-600)',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : step.id}
                </span>
                <span>{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TWO-COLUMN DESKTOP LAYOUT (LEFT: STEP FORM SLIDES, RIGHT: LIVE 3D PREVIEW) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem',
          alignItems: 'start'
        }}
        className="share-page-grid"
      >
        {/* LEFT COLUMN: ACTIVE STEP SLIDE */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* ====================================================
              STEP 1 SLIDE — ITEM BASICS
              ==================================================== */}
          {currentStep === 1 && (
            <div className="step-slide-container">
              <Card className="share-item-card" style={{ padding: 'clamp(1.15rem, 3vw, 1.75rem)' }}>
                <div style={{ borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#059669', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      1
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                      Item Basics
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '2px', marginLeft: '32px' }}>
                    Give your item a clear, descriptive name and choose its category.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Item Title */}
                  <Input
                    label="Item Title"
                    placeholder="e.g. Scientific Calculator, Wooden Study Table, Bluetooth Headphones"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (touched.title) validateField('title', e.target.value);
                    }}
                    onBlur={() => handleBlur('title', title)}
                    error={touched.title ? errors.title : ''}
                    helperText="Use a concise, friendly title. Avoid ALL CAPS."
                    required
                  />

                  {/* Category & Subcategory */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
                    <Select
                      label="Category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
                      required
                    />

                    <Select
                      label="Subcategory"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      options={subcategoryList.map((sub) => ({ value: sub, label: sub }))}
                      required
                    />
                  </div>

                  {/* Optional Brand & Model */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
                    <Input
                      label="Brand (Optional)"
                      placeholder="e.g. Casio, IKEA, Sony, Nike"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      helperText="Leave blank if unbranded or handmade"
                    />

                    <Input
                      label="Model or Edition (Optional)"
                      placeholder="e.g. FX-991ES Plus, 4th Edition"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </div>
                </div>

                {/* Step 1 Control Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-100)', flexWrap: 'wrap', gap: '10px' }}>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleNextStep}
                    iconRight={ArrowRight}
                    style={{ minWidth: '170px', justifyContent: 'center' }}
                  >
                    Next: Add Photos
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ====================================================
              STEP 2 SLIDE — PHOTOS
              ==================================================== */}
          {currentStep === 2 && (
            <div className="step-slide-container">
              <Card className="share-item-card" style={{ padding: 'clamp(1.15rem, 3vw, 1.75rem)' }}>
                <div style={{ borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#059669', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      2
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                      Add Photos
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '2px', marginLeft: '32px' }}>
                    Good photos help your item get discovered faster. First photo will be primary.
                  </p>
                </div>

                <ProductMediaUploader
                  images={images}
                  onChange={(newImgs) => {
                    setImages(newImgs);
                    if (touched.images) validateField('images', newImgs);
                  }}
                  onError={(err) => setErrors((prev) => ({ ...prev, images: err }))}
                />

                {/* Step 2 Control Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-100)', flexWrap: 'wrap', gap: '10px' }}>
                  <Button type="button" variant="outline" onClick={handlePrevStep} iconLeft={ArrowLeft}>
                    Previous: Item Basics
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleNextStep}
                    iconRight={ArrowRight}
                    style={{ minWidth: '170px', justifyContent: 'center' }}
                  >
                    Next: Sharing Type
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ====================================================
              STEP 3 SLIDE — SHARING TYPE
              ==================================================== */}
          {currentStep === 3 && (
            <div className="step-slide-container">
              <Card className="share-item-card" style={{ padding: 'clamp(1.15rem, 3vw, 1.75rem)' }}>
                <div style={{ borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#059669', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      3
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                      Sharing Type
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '2px', marginLeft: '32px' }}>
                    Choose how you want this item to be shared with the community.
                  </p>
                </div>

                {/* Sharing Type Cards Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                    gap: '12px',
                    marginBottom: '1.25rem'
                  }}
                  role="radiogroup"
                  aria-label="Sharing Type Selection"
                >
                  {[
                    {
                      id: 'free',
                      title: 'Free',
                      description: 'Share it with someone who needs it.',
                      icon: HeartHandshake,
                      color: '#059669'
                    },
                    {
                      id: 'give_away',
                      title: 'Give Away',
                      description: 'Pass it on permanently.',
                      icon: Gift,
                      color: '#10b981'
                    },
                    {
                      id: 'borrow',
                      title: 'Borrow',
                      description: 'Let someone use it for a period and return it.',
                      icon: Clock,
                      color: '#0284c7'
                    },
                    {
                      id: 'exchange',
                      title: 'Exchange',
                      description: 'Trade it for something useful.',
                      icon: Repeat,
                      color: '#b45309'
                    }
                  ].map((opt) => {
                    const isSelected = sharingType === opt.id;
                    const Icon = opt.icon;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSharingType(opt.id)}
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--radius-lg)',
                          border: isSelected ? '2px solid #059669' : '1px solid var(--color-slate-200)',
                          backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all var(--transition-fast)',
                          boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'
                        }}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') setSharingType(opt.id);
                        }}
                        className="sharing-type-card"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: isSelected ? '#d1fae5' : 'var(--color-slate-100)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Icon size={18} color={opt.color} />
                            </div>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--color-slate-900)' }}>
                              {opt.title}
                            </strong>
                          </div>

                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid #059669' : '2px solid var(--color-slate-300)',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>

                        <p style={{ fontSize: '0.78rem', color: 'var(--color-slate-500)', margin: '4px 0 0 0', lineHeight: 1.35 }}>
                          {opt.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* CONDITIONAL BORROW SETTINGS */}
                {sharingType === 'borrow' && (
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      animation: 'fadeIn 0.25s ease-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>
                      <Clock size={16} />
                      <span>Borrowing Settings</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <Input
                        label="Preferred Max Duration"
                        type="number"
                        min="1"
                        max="90"
                        value={borrowDuration}
                        onChange={(e) => setBorrowDuration(e.target.value)}
                        placeholder="e.g. 14"
                      />

                      <Select
                        label="Duration Unit"
                        value={borrowDurationUnit}
                        onChange={(e) => setBorrowDurationUnit(e.target.value)}
                        options={[
                          { value: 'days', label: 'Days' },
                          { value: 'weeks', label: 'Weeks' },
                          { value: 'months', label: 'Months' }
                        ]}
                      />
                    </div>

                    <Input
                      label="Borrowing Conditions / Notes (Optional)"
                      placeholder="e.g. Please return in original pouch with charging cable"
                      value={borrowNotes}
                      onChange={(e) => setBorrowNotes(e.target.value)}
                    />
                  </div>
                )}

                {/* CONDITIONAL EXCHANGE SETTINGS */}
                {sharingType === 'exchange' && (
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      animation: 'fadeIn 0.25s ease-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
                      <Repeat size={16} />
                      <span>Exchange Preferences</span>
                    </div>

                    <Input
                      label="What would you consider in exchange? (Optional)"
                      placeholder="e.g. Books, stationery, mechanical keyboard, or another study item"
                      value={exchangeWishlist}
                      onChange={(e) => setExchangeWishlist(e.target.value)}
                      helperText="Community trades only. No cash requests or product pricing."
                    />
                  </div>
                )}

                {/* Step 3 Control Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-100)' }}>
                  <Button type="button" variant="outline" onClick={handlePrevStep} iconLeft={ArrowLeft}>
                    Previous: Photos
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleNextStep}
                    iconRight={ArrowRight}
                    style={{ minWidth: '180px', justifyContent: 'center' }}
                  >
                    Next: Item Details
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ====================================================
              STEP 4 SLIDE — CONDITION & DESCRIPTION (ONE CARD)
              ==================================================== */}
          {currentStep === 4 && (
            <div className="step-slide-container">
              <Card className="share-item-card" style={{ padding: 'clamp(1.15rem, 3vw, 1.75rem)' }}>
                <div style={{ borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#059669', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      4
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                      Item Details
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '2px', marginLeft: '32px' }}>
                    Select the item condition rating and provide a helpful description for neighbors.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Item Condition */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '0.5rem' }}>
                      Item Condition Rating <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
                        gap: '10px'
                      }}
                      role="radiogroup"
                      aria-label="Item Condition"
                    >
                      {[
                        { id: 'new', label: 'New', desc: 'Brand new, never opened or used' },
                        { id: 'like_new', label: 'Like New', desc: 'Tested, zero flaws or signs of wear' },
                        { id: 'good', label: 'Good', desc: 'Used but fully functional with normal wear' },
                        { id: 'fair', label: 'Fair', desc: 'Functional with visible cosmetic wear' },
                        { id: 'needs_repair', label: 'Needs Repair', desc: 'Fixer-upper or for spare parts' }
                      ].map((c) => {
                        const isSelected = condition === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setCondition(c.id)}
                            style={{
                              padding: '12px',
                              borderRadius: 'var(--radius-md)',
                              border: isSelected ? '2px solid #059669' : '1px solid var(--color-slate-200)',
                              backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all var(--transition-fast)'
                            }}
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') setCondition(c.id);
                            }}
                            className="condition-card"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>{c.label}</strong>
                              {isSelected && <Check size={14} color="#059669" />}
                            </div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--color-slate-500)', margin: 0, lineHeight: 1.3 }}>
                              {c.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Item Description */}
                  <div>
                    <Textarea
                      label="Item Description"
                      placeholder="e.g. Bought for semester exams last year. Works perfectly with solar backing. Comes with protective slide-on hard case. Happy to pass it on!"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (touched.description) validateField('description', e.target.value);
                      }}
                      onBlur={() => handleBlur('description', description)}
                      error={touched.description ? errors.description : ''}
                      rows={4}
                      maxLength={1000}
                      helperText="Min 10 characters. Include usage history and included accessories."
                      required
                    />
                  </div>
                </div>

                {/* Step 4 Control Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-100)', flexWrap: 'wrap', gap: '10px' }}>
                  <Button type="button" variant="outline" onClick={handlePrevStep} iconLeft={ArrowLeft}>
                    Previous: Sharing Type
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleNextStep}
                    iconRight={ArrowRight}
                    style={{ minWidth: '160px', justifyContent: 'center' }}
                  >
                    Next: Location
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ====================================================
              STEP 5 SLIDE — LOCATION (ONLY LOCATION!)
              ==================================================== */}
          {currentStep === 5 && (
            <div className="step-slide-container">
              <Card className="share-item-card" style={{ padding: 'clamp(1.15rem, 3vw, 1.75rem)' }}>
                <div style={{ borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#059669', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      5
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                      Approximate Location
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '2px', marginLeft: '32px' }}>
                    Your exact home address will never be publicly displayed.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
                    <Input
                      label="City / Metro Region"
                      placeholder="e.g. Bengaluru, Mumbai, Delhi, Pune"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (touched.city) validateField('city', e.target.value);
                      }}
                      onBlur={() => handleBlur('city', city)}
                      error={touched.city ? errors.city : ''}
                      required
                    />

                    <Input
                      label="Locality / Neighborhood (Optional)"
                      placeholder="e.g. Indiranagar, Koramangala, Bandra West"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      helperText="Do not enter apartment numbers or street names."
                    />

                    <Input
                      label="Contact Number (Saved to Customer Account)"
                      placeholder="e.g. +91 98765 43210"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      helperText="Stored in database and displayed in admin panel."
                    />
                  </div>

                  {/* Use My Location Optional Helper */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={detectingLocation}
                      style={{
                        background: 'none',
                        border: '1px solid var(--color-slate-300)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--color-slate-700)',
                        cursor: detectingLocation ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#ffffff'
                      }}
                      className="use-location-btn"
                    >
                      <Compass size={15} color="#059669" />
                      <span>{detectingLocation ? 'Detecting approximate zone...' : 'Use My Approximate Location'}</span>
                    </button>

                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                      Browser permission is optional. Manual input is always supported.
                    </span>
                  </div>

                  {/* Interactive Map Location Selector */}
                  <GoogleMapPicker
                    initialCoordinates={coordinates}
                    initialLocality={locality}
                    initialCity={city}
                    onChange={({ coordinates: newCoords, locality: newLoc, city: newCity }) => {
                      if (newCoords) setCoordinates(newCoords);
                      if (newLoc) setLocality(newLoc);
                      if (newCity) {
                        setCity(newCity);
                        if (touched.city) validateField('city', newCity);
                      }
                    }}
                  />
                </div>

                {/* Step 5 Control Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-100)', flexWrap: 'wrap', gap: '10px' }}>
                  <Button type="button" variant="outline" onClick={handlePrevStep} iconLeft={ArrowLeft}>
                    Previous: Item Details
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleNextStep}
                    iconRight={ArrowRight}
                    style={{ minWidth: '180px', justifyContent: 'center' }}
                  >
                    Next: Availability &amp; Rules
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ====================================================
              STEP 6 SLIDE — AVAILABILITY & COMMUNITY RULES
              ==================================================== */}
          {currentStep === 6 && (
            <div className="step-slide-container">
              <Card className="share-item-card" style={{ padding: 'clamp(1.15rem, 3vw, 1.75rem)' }}>
                <div style={{ borderBottom: '1px solid var(--color-slate-100)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#059669', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      6
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                      Availability &amp; Community Rules
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '2px', marginLeft: '32px' }}>
                    Confirm listing readiness and review community guidelines.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
                    <Select
                      label="Listing Availability"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      options={[
                        { value: 'Available', label: 'Available (Can be requested immediately)' },
                        { value: 'Unavailable', label: 'Unavailable (Save as inactive)' }
                      ]}
                    />

                    <Input
                      label="Approximate Year of Purchase (Optional)"
                      placeholder="e.g. 2023"
                      value={optionalYear}
                      onChange={(e) => setOptionalYear(e.target.value)}
                    />
                  </div>

                  {/* Responsible Use Notice */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--color-slate-200)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <ShieldCheck size={20} color="#059669" flexShrink={0} />
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-slate-600)', lineHeight: 1.4 }}>
                      <strong>Responsible Community Policy:</strong> Only share items that are legal, safe, and appropriate for community sharing. Prohibited items or hazardous goods will be suspended by platform moderation.
                    </p>
                  </div>
                </div>

                {/* Step 6 Control Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-100)', flexWrap: 'wrap', gap: '10px' }}>
                  <Button type="button" variant="outline" onClick={handlePrevStep} iconLeft={ArrowLeft}>
                    Previous: Location
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleNextStep}
                    iconRight={ArrowRight}
                    style={{ minWidth: '180px', justifyContent: 'center' }}
                  >
                    Next: Review &amp; Publish
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ====================================================
              STEP 7 SLIDE — REVIEW & PUBLISH ACTIONS
              ==================================================== */}
          {currentStep === 7 && (
            <div className="step-slide-container">
              <Card className="share-item-card" style={{ padding: 'clamp(1.15rem, 3vw, 1.75rem)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#059669', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      7
                    </span>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                        Review &amp; Final Publish
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                        Check your item details before sharing with the LOOOP community.
                      </span>
                    </div>
                  </div>
                  <Badge variant="success">Step 7 of 7</Badge>
                </div>

                {/* Formatted Summary Review Table */}
                <div
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--color-slate-200)',
                    padding: '16px',
                    marginBottom: '1.5rem',
                    fontSize: '0.85rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
                    gap: '14px'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>ITEM TITLE</span>
                    <strong style={{ color: 'var(--color-slate-900)' }}>{title || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>CATEGORY</span>
                    <strong style={{ color: 'var(--color-slate-800)' }}>{currentCategoryObj.name} ({subcategory})</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>SHARING TYPE</span>
                    <strong style={{ color: '#059669', textTransform: 'capitalize' }}>{sharingType.replace('_', ' ')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>CONDITION</span>
                    <strong style={{ color: 'var(--color-slate-800)', textTransform: 'capitalize' }}>{condition.replace('_', ' ')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>PHOTOS</span>
                    <strong style={{ color: 'var(--color-slate-800)' }}>{images.length} attached</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>APPROXIMATE LOCATION</span>
                    <strong style={{ color: 'var(--color-slate-800)' }}>{locality ? `${locality}, ${city}` : city}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>AVAILABILITY</span>
                    <strong style={{ color: 'var(--color-slate-800)' }}>{availability}</strong>
                  </div>
                </div>

                {/* Description Excerpt */}
                {description && (
                  <div
                    style={{
                      marginBottom: '1.5rem',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--color-slate-200)'
                    }}
                  >
                    <span style={{ color: 'var(--color-slate-400)', display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>
                      DESCRIPTION PREVIEW
                    </span>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-slate-700)', lineHeight: 1.45 }}>
                      {description}
                    </p>
                  </div>
                )}

                {/* Final Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--color-slate-100)'
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={formStatus === 'submitting'}
                    iconLeft={ArrowLeft}
                  >
                    Back to Edit
                  </Button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={formStatus === 'submitting'}
                      disabled={formStatus === 'submitting'}
                      iconRight={ArrowRight}
                      style={{ minWidth: '190px', justifyContent: 'center' }}
                    >
                      {formStatus === 'submitting' ? 'Publishing...' : 'Publish Item'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </form>

        {/* RIGHT COLUMN: LIVE 3D LISTING PREVIEW (DESKTOP) */}
        <aside className="share-preview-column">
          <LiveListingPreview
            title={title}
            category={currentCategoryObj.name}
            subcategory={subcategory}
            brand={brand}
            model={model}
            sharingType={sharingType}
            condition={condition}
            location={locality ? `${locality}, ${city}` : city}
            images={images}
            borrowSettings={{
              maxDurationDays: borrowDuration,
              maxDurationUnit: borrowDurationUnit,
              notes: borrowNotes
            }}
            exchangeDetails={{
              wantedItems: exchangeWishlist
            }}
            currentUser={user}
          />
        </aside>
      </div>

      {/* Embedded CSS for slide transitions & responsive layout */}
      <style>{`
        .share-page-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px !important;
          gap: 1.75rem;
          align-items: start;
          width: 100%;
        }
        @media (max-width: 1024px) {
          .share-page-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 1.5rem;
          }
          .share-preview-column {
            order: 2;
            margin-top: 1.5rem;
            position: static !important;
            width: 100% !important;
          }
          .share-preview-column > div {
            position: static !important;
            top: auto !important;
          }
        }
        @media (max-width: 640px) {
          .share-page-grid {
            gap: 1rem;
          }
          .share-item-card {
            padding: 1.1rem 0.85rem !important;
          }
          .use-location-btn {
            width: 100% !important;
            justify-content: center !important;
          }
        }
        .step-slide-container {
          animation: slideInStep 0.25s ease-out forwards;
          width: 100%;
        }
        @keyframes slideInStep {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .sharing-type-card:hover, .condition-card:hover {
          border-color: #059669 !important;
        }
        .use-location-btn:hover {
          background-color: var(--color-slate-50) !important;
          border-color: #059669 !important;
        }
        .step-pills-scroll::-webkit-scrollbar {
          height: 3px;
        }
        .step-pills-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default ShareItemPage;
