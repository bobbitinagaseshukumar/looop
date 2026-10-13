import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, MapPin, Award, Clock } from 'lucide-react';
import Avatar from '../common/Avatar';

export const OwnerProfileCard = ({ owner }) => {
  if (!owner) return null;

  const displayName = owner.name || 'Community Sharer';
  const ownerId = owner._id || owner.id;
  const isVerified = owner.verified !== false;
  const locationText = [owner.locality, owner.city].filter(Boolean).join(', ') || owner.approximateAddress || '';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}
      className="owner-profile-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
          Shared by
        </span>
        {isVerified && (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="#059669" />
            <span>Verified Member</span>
          </span>
        )}
      </div>

      {/* Owner Avatar & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {ownerId ? (
          <Link to={`/users/${ownerId}`} style={{ textDecoration: 'none' }}>
            <Avatar src={owner.avatar} name={displayName} size="md" />
          </Link>
        ) : (
          <Avatar src={owner.avatar} name={displayName} size="md" />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {ownerId ? (
            <Link
              to={`/users/${ownerId}`}
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textDecoration: 'none',
                display: 'block'
              }}
              className="owner-name-link"
            >
              {displayName}
            </Link>
          ) : (
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {displayName}
            </h3>
          )}
          
          {locationText ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              <MapPin size={12} color="#059669" />
              <span>{locationText}</span>
            </div>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
              Active Looop Member
            </span>
          )}
        </div>
      </div>

      {/* Owner Bio if available */}
      {owner.bio && (
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.825rem',
          color: '#475569',
          fontStyle: 'italic',
          lineHeight: 1.4
        }}>
          "{owner.bio}"
        </div>
      )}

      {/* Trust & Response Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid #f8fafc', fontSize: '0.78rem', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Award size={13} color="#059669" />
          <span>{owner.trustScore || 95}% Trust Score</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={13} color="#64748b" />
          <span>Responds {owner.responseRate || 'within 1 hour'}</span>
        </div>
      </div>

      {/* Public Profile Link */}
      {ownerId && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <Link
            to={`/users/${ownerId}`}
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#047857',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            className="view-member-profile-link"
          >
            <span>View member profile</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      <style>{`
        .view-member-profile-link:hover {
          text-decoration: underline;
        }
        .owner-name-link:hover {
          color: #047857;
        }
      `}</style>
    </div>
  );
};

export default OwnerProfileCard;


