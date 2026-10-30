/**
 * @module components/layout/Sidebar
 * @description Navigation sidebar styled fully in Ga South Municipal Assembly
 * Dominant Crimson (#991B1B) identity.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Map,
  CheckSquare,
  Users,
  Building2,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/** Navigation items with role restrictions */
const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { path: '/capture', label: 'Capture Record', icon: MapPin, roles: ['collector'] },
  { path: '/records', label: 'Revenue Records', icon: ClipboardList, roles: null },
  { path: '/map', label: 'Map Explorer', icon: Map, roles: null },
  { path: '/review', label: 'Review & Approvals', icon: CheckSquare, roles: ['supervisor', 'budget_director', 'admin'] },
  { path: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
  { path: '/admin/zones', label: 'Zones', icon: Building2, roles: ['admin', 'supervisor'] },
];

/**
 * Sidebar component — full #991B1B Municipal Crimson theme.
 * @param {{ open: boolean, onClose: Function }} props
 */
export default function Sidebar({ open, onClose }) {
  const { user, logout, hasRole } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => hasRole(r))
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — dominant #991B1B */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#991B1B] text-white shadow-2xl
          transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand header */}
        <div className="flex h-24 items-center justify-between px-4 border-b border-white/10 bg-[#7f1d1d]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full bg-white p-1 ring-2 ring-amber-400 shadow-lg flex items-center justify-center overflow-hidden">
                <img
                  src="/gasouth-logo.png"
                  alt="Ga South Municipal Assembly"
                  className="w-full h-full object-contain"
                />
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#7f1d1d]"
                title="System Online"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">
                Ga South Municipal
              </span>
              <span className="text-sm font-black tracking-tight text-white truncate">
                Ngleshie Amanfro DCS
              </span>
              <span className="text-[9px] font-bold text-red-200 tracking-wide uppercase mt-0.5">
                Ekome Feemɔ Kɛ Nɔyaa
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-red-200 hover:text-white hover:bg-white/10 md:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-red-200/80">
            Navigation Menu
          </div>
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all
                ${
                  isActive
                    ? 'bg-white text-[#991B1B] shadow-md border-l-4 border-amber-400'
                    : 'text-red-100 hover:bg-white/15 hover:text-white border-l-4 border-transparent'
                }`
              }
            >
              <item.icon size={19} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 bg-[#7f1d1d] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white text-[#991B1B] flex items-center justify-center font-black text-sm ring-2 ring-amber-400 shadow-md">
              {user?.full_name
                ? user.full_name.charAt(0).toUpperCase()
                : user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate text-white">{user?.full_name || user?.username}</p>
              <p className="text-xs text-amber-200 capitalize flex items-center gap-1 font-semibold">
                <ShieldCheck size={12} className="inline text-emerald-300" />
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold text-white transition-all active:scale-95 border border-white/10"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
