/**
 * @module components/layout/Layout
 * @description Main application layout with responsive sidebar + header + content.
 * Sidebar is a left panel on desktop, a slideover on mobile.
 */

import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * Protected layout wrapper. Redirects to /login when unauthenticated.
 * Optionally restricts access to specific roles.
 * @param {{ allowedRoles?: string[] }} props
 */
export default function Layout({ allowedRoles }) {
  const { isAuthenticated, loading, user, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Show a loading spinner while checking auth */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  /* Redirect to login if unauthenticated */
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  /* Block if user role is not allowed */
  if (allowedRoles && !allowedRoles.some((r) => hasRole(r))) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-2">🔒</p>
          <h2 className="text-xl font-semibold text-gray-800">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-1">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
