import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CaptureRecord from './pages/CaptureRecord';
import Records from './pages/Records';
import RecordDetailPage from './pages/RecordDetailPage';
import MapExplorer from './pages/MapExplorer';
import ReviewRecords from './pages/ReviewRecords';
import ManageUsers from './pages/ManageUsers';
import ManageZones from './pages/ManageZones';
import { useAuth } from './contexts/AuthContext';

function RoleGuard({ allowedRoles, children }) {
  const { hasRole, loading } = useAuth();

  if (loading) return null;

  if (!allowedRoles.some((r) => hasRole(r))) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center bg-white p-8 rounded-3xl border border-gray-200 shadow-sm max-w-sm">
          <p className="text-4xl mb-3">🔒</p>
          <h3 className="text-base font-bold text-gray-900">Access Restricted</h3>
          <p className="text-xs text-gray-500 mt-1">
            You do not have permission to access this management section.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected App Routes inside Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/capture" element={<CaptureRecord />} />
        <Route path="/records" element={<Records />} />
        <Route path="/records/:id" element={<RecordDetailPage />} />
        <Route path="/map" element={<MapExplorer />} />

        {/* Supervisor, Budget Director & Admin */}
        <Route
          path="/review"
          element={
            <RoleGuard allowedRoles={['supervisor', 'budget_director', 'admin']}>
              <ReviewRecords />
            </RoleGuard>
          }
        />

        {/* Admin only */}
        <Route
          path="/admin/users"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <ManageUsers />
            </RoleGuard>
          }
        />

        <Route
          path="/admin/zones"
          element={
            <RoleGuard allowedRoles={['admin', 'supervisor']}>
              <ManageZones />
            </RoleGuard>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
