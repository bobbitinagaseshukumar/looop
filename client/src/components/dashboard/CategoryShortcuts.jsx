import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Laptop,
  GraduationCap,
  Armchair,
  Shirt,
  Trophy,
  Wrench,
  Home,
  ArrowRight
} from 'lucide-react';
import itemService from '../../services/itemService';

const CATEGORIES = [
  { id: 'education', name: 'Study Materials', icon: GraduationCap, color: '#059669', bg: '#ecfdf5' },
  { id: 'books', name: 'Books & Notes', icon: BookOpen, color: '#0284c7', bg: '#f0f9ff' },
  { id: 'electronics', name: 'Electronics', icon: Laptop, color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'tools', name: 'Tools & DIY', icon: Wrench, color: '#d97706', bg: '#fffbeb' },
  { id: 'furniture', name: 'Furniture', icon: Armchair, color: '#ea580c', bg: '#fff7ed' },
  { id: 'sports', name: 'Sports & Fitness', icon: Trophy, color: '#16a34a', bg: '#f0fdf4' },
  { id: 'clothing', name: 'Clothing', icon: Shirt, color: '#db2777', bg: '#fdf2f8' },
  { id: 'home', name: 'Home & Kitchen', icon: Home, color: '#4f46e5', bg: '#eef2ff' }
];

export const CategoryShortcuts = () => {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let isMounted = true;
    itemService
      .getCategories()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.categoryCounts) {
          setCounts(res.categoryCounts);
        } else if (res && Array.isArray(res.categories)) {
          const map = {};
          res.categories.forEach((c) => {
            if (c.id && typeof c.count === 'number') {
              map[c.id] = c.count;
            }
          });
          setCounts(map);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
            Discover Something Useful
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', margin: '2px 0 0 0' }}>
            Jump directly into curated community categories
          </p>
        </div>
        <Link
          to="/browse"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.85rem',
            color: 'var(--color-primary-700)',
            fontWeight: 700,
            textDecoration: 'none'
          }}
          className="see-all-categories-link"
        >
          <span>All Categories</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
          gap: '12px'
        }}
        className="categories-grid"
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              to={`/browse?category=${cat.id}`}
              style={{
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '8px',
                  transition: 'all var(--transition-fast)'
                }}
                className="category-shortcut-chip"
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: cat.bg,
                    color: cat.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform var(--transition-fast)'
                  }}
                  className="cat-icon-wrap"
                >
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-800)', lineHeight: 1.2 }}>
                    {cat.name}
                  </div>
                  {counts[cat.id] > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-400)', fontWeight: 500 }}>
                      {counts[cat.id]} {counts[cat.id] === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <style>{`
        .category-shortcut-chip:hover {
          transform: translateY(-2px);
          border-color: var(--color-primary-400) !important;
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
        }
        .category-shortcut-chip:hover .cat-icon-wrap {
          transform: scale(1.1);
        }
        .see-all-categories-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default CategoryShortcuts;
