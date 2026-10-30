/**
 * @module components/layout/Header
 * @description Top header bar with municipal identity, breadcrumb, mobile menu toggle,
 * and quick-action buttons styled in Ga South Crimson (#991B1B) and Obsidian Black (#000000).
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/** Maps route paths to display names for breadcrumbs */
const ROUTE_LABELS = {
  '': 'Dashboard',
  capture: 'Capture Record',
  records: 'Revenue Records',
  map: 'Map Explorer',
  review: 'Review & Approvals',
  admin: 'Administration',
  users: 'User Accounts',
  zones: 'Collection Zones',
};

/**
 * Header component rendered at the top of each page.
 * @param {{ onMenuClick: Function }} props
 */
export default function Header({ onMenuClick }) {
  const location = useLocation();
  const { hasRole } = useAuth();

  /* Build breadcrumb from current path */
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pageTitle =
    pathSegments.length === 0
      ? 'Dashboard Overview'
      : ROUTE_LABELS[pathSegments[pathSegments.length - 1]] ||
        pathSegments[pathSegments.length - 1];

  const crumbs = [
    { label: 'Home', path: '/' },
    ...pathSegments.map((seg, idx) => ({
      label: ROUTE_LABELS[seg] || seg,
      path: '/' + pathSegments.slice(0, idx + 1).join('/'),
    })),
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#991B1B]/20 bg-white/95 backdrop-blur px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-black hover:bg-red-50 md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        {/* Logo — mobile only (sidebar is hidden on mobile) */}
        <div className="flex items-center gap-2 md:hidden">
          <img
            src="/gasouth-logo.png"
            alt="Ga South Crest"
            className="w-9 h-9 rounded-full object-contain ring-2 ring-amber-400 bg-white p-0.5"
          />
        </div>

        {/* Breadcrumb & Title */}
        <div>
          <nav className="hidden md:flex items-center gap-1 text-xs text-gray-400">
            {crumbs.map((crumb, i) => (
              <React.Fragment key={crumb.path}>
                {i > 0 && <span className="mx-1 text-gray-300">/</span>}
                {i < crumbs.length - 1 ? (
                  <Link to={crumb.path} className="hover:text-[#991B1B] font-medium transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-800 font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
          <h1 className="text-lg font-black text-black md:mt-0.5 tracking-tight flex items-center gap-2">
            <span>{pageTitle}</span>
          </h1>
        </div>
      </div>

      {/* Assembly Tag & Quick actions */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-black border border-[#991B1B]/60 rounded-full text-xs font-bold text-white shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[#fca5a5]">Ga South</span>
          <span className="text-gray-400">&bull;</span>
          <span className="text-amber-300 font-semibold text-[11px]">EKOME FEEMƆ KƐ NƆYAA</span>
        </div>

        {hasRole('collector') && (
          <Link
            to="/capture"
            className="flex items-center gap-1.5 rounded-xl bg-[#991B1B] hover:bg-[#7f1d1d] px-3.5 py-2 text-sm font-bold text-white shadow-md shadow-[#991B1B]/30 transition-all active:scale-[0.98] ring-1 ring-amber-400/40"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Record</span>
          </Link>
        )}
      </div>
    </header>
  );
}
