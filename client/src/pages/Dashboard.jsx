import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  Download,
  Coins,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import StatsCards from '../components/dashboard/StatsCards';
import CoverageMap from '../components/dashboard/CoverageMap';
import CollectorStats from '../components/dashboard/CollectorStats';
import RecentActivity from '../components/dashboard/RecentActivity';
import BudgetRevenueSummary from '../components/dashboard/BudgetRevenueSummary';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, hasRole } = useAuth();

  const [stats, setStats] = useState({});
  const [coverage, setCoverage] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [statsRes, coverageRes, activityRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/coverage'),
        api.get('/api/dashboard/recent-activity'),
      ]);

      setStats(statsRes.data || {});
      setCoverage(coverageRes.data?.coverage || []);
      setActivity(activityRes.data?.activity || []);

      if (hasRole('supervisor') || hasRole('admin')) {
        const collectorsRes = await api.get('/api/dashboard/collector-stats');
        setCollectors(collectorsRes.data?.collectors || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleExportApprovedCSV = async () => {
    try {
      const res = await api.get('/api/records/export/csv?status=approved', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certified_revenue_register_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to download certified revenue register.');
    }
  };

  const isBudgetDirector = hasRole('budget_director');
  const isAdmin = hasRole('admin');
  const isSupervisor = hasRole('supervisor');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Dynamic Welcome Banner — Ga South Crimson Identity */}
      <div className="rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#991B1B] via-[#7f1d1d] to-[#450a0a]">
        <div>
            <span className="text-[11px] uppercase tracking-widest font-bold text-amber-300 block">
              {isBudgetDirector
                ? 'Budget & Revenue Directorate • Municipal Assembly'
                : isSupervisor
                ? 'Data Supervisory & Quality Control Command'
                : 'Ga South Municipal Assembly • Ngleshie Amanfro DCS'}
            </span>
            <h2 className="text-xl font-black mt-0.5">Welcome, {user?.full_name}</h2>
            <p className="text-xs text-red-200 mt-1">
              Role: <span className="capitalize font-bold text-white">{user?.role?.replace('_', ' ')}</span>
              {user?.zone_name && ` • Zone: ${user.zone_name}`}
              {isBudgetDirector && (
                <span className="ml-2 bg-white/10 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/30 text-[10px]">
                  Final Authorization Authority
                </span>
              )}
            </p>
          </div>

        {/* Quick Actions in Banner for Budget Director / Supervisor */}
        <div className="flex flex-wrap items-center gap-2">
          {isBudgetDirector && (
            <>
              <Link
                to="/review"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Review & Authorize ({stats.reviewed_count || 0})</span>
              </Link>

              <button
                type="button"
                onClick={handleExportApprovedCSV}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Certified Register (CSV)</span>
              </button>
            </>
          )}

          {isSupervisor && (
            <Link
              to="/review"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Supervisor Queue ({stats.submitted_count || 0})</span>
            </Link>
          )}
        </div>
      </div>

      {/* Top Metrics Cards (Role-Tailored) */}
      <StatsCards stats={stats} />

      {/* Budget & Revenue Intelligence Section (for Budget Director and Admin) */}
      {(isBudgetDirector || isAdmin) && (
        <BudgetRevenueSummary stats={stats} coverage={coverage} />
      )}

      {/* Operational Grid: Coverage Map & Activity / Collector Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CoverageMap coverage={coverage} />
        {isSupervisor || isAdmin ? (
          <CollectorStats collectors={collectors} />
        ) : (
          <RecentActivity activity={activity} />
        )}
      </div>

      {(isSupervisor || isAdmin) && (
        <RecentActivity activity={activity} />
      )}
    </div>
  );
}
