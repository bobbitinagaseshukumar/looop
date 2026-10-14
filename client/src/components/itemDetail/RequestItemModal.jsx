import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Calendar,
  Sparkles,
  AlertCircle,
  User,
  ArrowRight,
  UserPlus,
  MapPin,
  Phone,
  ShieldCheck,
  Package,
  Layers
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { formatSharingType, formatCondition, formatLocation } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useLocationContext } from '../../context/LocationContext';
import { itemService } from '../../services/itemService';

export const RequestItemModal = ({
  item,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  error = null
}) => {
  const { user, isAuthenticated } = useAuth();
  const { location } = useLocationContext();
  const navigate = useNavigate();

  const [message, setMessage] = useState('');
  const [requesterLocation, setRequesterLocation] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [offeredItemId, setOfferedItemId] = useState('');
  const [myItems, setMyItems] = useState([]);
  const [loadingMyItems, setLoadingMyItems] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isLoggedIn = !!(user && (isAuthenticated || user.id || user.email));

  // Initialize requester location and contact from profile/context
  useEffect(() => {
    if (isOpen) {
      const defaultLoc = (user?.locality && user?.city)
        ? `${user.locality}, ${user.city}`
        : (user?.city || (location?.city || location?.locality || 'Indiranagar, Bangalore'));
      setRequesterLocation(defaultLoc);
      setRequesterPhone(user?.phone || '');
    }
  }, [isOpen, user, location]);

  // Load user's own items if this is an exchange request
  useEffect(() => {
    if (isOpen && isLoggedIn && item?.sharingType === 'exchange') {
      const loadUserItems = async () => {
        setLoadingMyItems(true);
        try {
          const res = await itemService.getMyItems({ status: 'available', limit: 30 });
          const available = (res?.items || []).filter(
            (i) => (i.availability === 'Available' || i.status === 'AVAILABLE' || !i.status) && (i.id || i._id) !== (item.id || item._id)
          );
          setMyItems(available);
          if (available.length > 0) {
            setOfferedItemId(available[0].id || available[0]._id);
          }
        } catch (err) {
          console.error('Failed to load user items for exchange:', err);
        } finally {
          setLoadingMyItems(false);
        }
      };
      loadUserItems();
    }
  }, [isOpen, isLoggedIn, item?.sharingType, item?.id]);

  if (!item) return null;

  const itemTitle = item.title || item.name || 'this item';
  const sharingInfo = formatSharingType(item.sharingType);
  const conditionInfo = formatCondition(item.condition);
  const primaryImage =
    item.images && item.images.length > 0
      ? typeof item.images[0] === 'string'
        ? item.images[0]
        : item.images[0]?.url
      : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!isLoggedIn) {
      const currentUrl = window.location.pathname + window.location.search;
      const separator = currentUrl.includes('?') ? '&' : '?';
      navigate(`/login?redirect=${encodeURIComponent(`${currentUrl}${separator}action=request`)}`);
      return;
    }

    // Determine type
    let requestType = 'REQUEST_ITEM';
    if (item.sharingType === 'borrow') requestType = 'BORROW';
    if (item.sharingType === 'exchange') requestType = 'EXCHANGE';

    // Validate Borrow return date
    if (requestType === 'BORROW') {
      if (!expectedReturnDate) {
        setValidationError('Please select an expected return date.');
        return;
      }
      const returnDateObj = new Date(expectedReturnDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (returnDateObj <= today) {
        setValidationError('Return date must be in the future.');
        return;
      }
    }

    // Validate Exchange item
    if (requestType === 'EXCHANGE') {
      if (!offeredItemId) {
        setValidationError('Please select an item from your collection to offer in exchange.');
        return;
      }
    }

    onSubmit({
      itemId: item.id || item._id,
      type: requestType,
      message: message.trim(),
      location: requesterLocation.trim(),
      phone: requesterPhone.trim(),
      expectedReturnDate: requestType === 'BORROW' ? expectedReturnDate : undefined,
      offeredItemId: requestType === 'EXCHANGE' ? offeredItemId : undefined
    });
  };

  // If user is not logged in, display sign in or create account modal
  if (!isLoggedIn) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Sign In or Create Account">
        <div style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-50)',
              color: 'var(--color-primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}
          >
            <User size={28} />
          </div>

          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '0.5rem' }}>
            Account Required to Request
          </h3>

          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '420px', margin: '0 auto 2rem auto' }}>
            To exchange, borrow, or request <strong>"{itemTitle}"</strong>, please sign in or create a free account.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: '340px', margin: '0 auto' }}>
            <Button
              variant="primary"
              size="lg"
              style={{ width: '100%' }}
              iconRight={ArrowRight}
              onClick={() => {
                onClose();
                navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + '?action=request')}`);
              }}
            >
              Log In to LOOOP
            </Button>

            <Button
              variant="outline"
              size="lg"
              style={{ width: '100%' }}
              iconLeft={UserPlus}
              onClick={() => {
                onClose();
                navigate(`/register?redirect=${encodeURIComponent(window.location.pathname + '?action=request')}`);
              }}
            >
              Create a Free Account
            </Button>

            <Button variant="ghost" size="sm" style={{ width: '100%', marginTop: '4px' }} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        item.sharingType === 'borrow'
          ? `Request to Borrow "${itemTitle}"`
          : item.sharingType === 'exchange'
          ? `Request Exchange for "${itemTitle}"`
          : `Request "${itemTitle}"`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            onClick={handleSubmit}
            iconLeft={Send}
          >
            Send Request
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Error Alert */}
        {(error || validationError) && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-danger-bg, #fef2f2)',
              color: '#991b1b',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid var(--color-danger-border, #fecaca)'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{validationError || error}</span>
          </div>
        )}

        {/* Item Summary Card */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-slate-200)',
            alignItems: 'center'
          }}
        >
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={itemTitle}
              style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-slate-500)', flexShrink: 0 }}>
              <Package size={24} />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: '0 0 4px 0', lineHeight: 1.3 }}>
              {itemTitle}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--color-slate-600)' }}>
              <span>Owner: <strong>{item.owner?.name || 'Community Member'}</strong></span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>Condition: {conditionInfo.label}</span>
              {item.location && (
                <>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <MapPin size={12} color="var(--color-primary-600)" />
                    {formatLocation(item.location)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sharing Type Highlight */}
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.825rem',
            color: '#065f46'
          }}
        >
          <Sparkles size={15} color="#059669" style={{ flexShrink: 0 }} />
          <span>
            <strong>{sharingInfo.label}:</strong> {sharingInfo.description}
          </span>
        </div>

        {/* Borrow Duration / Return Date (Only if sharingType === 'borrow') */}
        {item.sharingType === 'borrow' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="expected-return-date" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
              Expected Return Date <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              id="expected-return-date"
              type="date"
              value={expectedReturnDate}
              onChange={(e) => {
                setExpectedReturnDate(e.target.value);
                setValidationError('');
              }}
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-slate-300)',
                backgroundColor: '#ffffff',
                color: 'var(--color-slate-900)',
                fontSize: '0.875rem'
              }}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
              Specify when you plan to return the item to the owner.
            </span>
          </div>
        )}

        {/* Exchange Offered Item Selector (Only if sharingType === 'exchange') */}
        {item.sharingType === 'exchange' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="offered-item-select" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
              Select an Item from Your Collection to Exchange <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>

            {loadingMyItems ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', padding: '8px' }}>
                Loading your available items...
              </div>
            ) : myItems.length > 0 ? (
              <select
                id="offered-item-select"
                value={offeredItemId}
                onChange={(e) => {
                  setOfferedItemId(e.target.value);
                  setValidationError('');
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-slate-300)',
                  backgroundColor: '#ffffff',
                  color: 'var(--color-slate-900)',
                  fontSize: '0.875rem'
                }}
                required
              >
                {myItems.map((my) => (
                  <option key={my.id || my._id} value={my.id || my._id}>
                    {my.title} ({my.category} • Condition: {my.condition})
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', fontSize: '0.85rem' }}>
                You don't have any items listed as available yet. You can share an item first, or explain your offer in the message below.
              </div>
            )}
          </div>
        )}

        {/* Requester Pickup Location & Contact (Dispatched to owner via email) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="requester-location" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-800)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="#059669" />
              <span>Your Location / Pickup Area (Sent to Owner)</span>
            </label>
            <input
              id="requester-location"
              type="text"
              value={requesterLocation}
              onChange={(e) => setRequesterLocation(e.target.value)}
              placeholder="e.g. Indiranagar, Bangalore"
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-slate-300)',
                backgroundColor: '#ffffff',
                color: 'var(--color-slate-900)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="requester-phone" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-800)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={15} color="#059669" />
              <span>Phone / Contact Number (Optional)</span>
            </label>
            <input
              id="requester-phone"
              type="tel"
              value={requesterPhone}
              onChange={(e) => setRequesterPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-slate-300)',
                backgroundColor: '#ffffff',
                color: 'var(--color-slate-900)',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        {/* Message to Owner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="request-message" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
            Message to {item.owner?.name || 'Owner'}
          </label>
          <textarea
            id="request-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Why would you like to reuse this item?"
            maxLength={2000}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-slate-300)',
              backgroundColor: '#ffffff',
              color: 'var(--color-slate-900)',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              resize: 'vertical'
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', alignSelf: 'flex-end' }}>
            {message.length}/2000
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--color-slate-500)', lineHeight: 1.45 }}>
          * Upon submission, your request will appear in the owner's incoming queue. Once accepted, safe handover logistics will be unlocked.
        </div>
      </form>
    </Modal>
  );
};

export default RequestItemModal;
