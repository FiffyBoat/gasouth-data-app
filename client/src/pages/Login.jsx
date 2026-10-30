import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#991B1B] flex flex-col justify-center items-center p-4 relative">
      {/* Container — Maintained clean white card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 relative z-10 border border-red-100/40">
        
        {/* Branding & Logo */}
        <div className="text-center space-y-2.5">
          <div className="relative inline-block mx-auto">
            <img
              src="/gasouth-logo.png"
              alt="Ga South Municipal Assembly Logo"
              className="w-28 h-28 object-contain mx-auto transition-transform hover:scale-105"
            />
          </div>

          <div>
            <span className="text-[11px] font-black tracking-widest uppercase text-amber-600 block">
              Republic of Ghana
            </span>
            <h1 className="text-xl font-black tracking-tight text-gray-900 mt-0.5">
              Ga South Municipal Assembly
            </h1>
            <p className="text-xs font-bold text-[#991B1B]">
              Ngleshie Amanfro Data Collection System
            </p>
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed px-4">
            GPS-Tagged Property & Business Geo-Data Collection Portal
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Officer Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. admin or collector1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#991B1B] focus:border-[#991B1B] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#991B1B] focus:border-[#991B1B] focus:outline-none"
              />
            </div>
          </div>

          {/* Action Button in #991B1B */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#991B1B] hover:bg-[#7f1d1d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#991B1B]/30 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>{loading ? 'Authenticating Officer...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Credentials Helper */}
        <div className="pt-4 border-t border-gray-100 text-xs space-y-2">
          <span className="text-gray-500 font-bold block text-[11px] uppercase tracking-wider">
            Quick Sign-In Accounts:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="p-2 bg-gray-50 hover:bg-red-50 hover:text-[#991B1B] hover:border-red-300 border border-gray-200 rounded-xl text-gray-700 font-semibold text-[11px] text-left transition-all"
            >
              <span className="block text-[#991B1B] font-bold">Admin</span>
              <span className="text-[10px] text-gray-400">admin123</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('collector1', 'collect123')}
              className="p-2 bg-gray-50 hover:bg-red-50 hover:text-[#991B1B] hover:border-red-300 border border-gray-200 rounded-xl text-gray-700 font-semibold text-[11px] text-left transition-all"
            >
              <span className="block text-[#991B1B] font-bold">Collector</span>
              <span className="text-[10px] text-gray-400">collect123</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('supervisor1', 'super123')}
              className="p-2 bg-gray-50 hover:bg-red-50 hover:text-[#991B1B] hover:border-red-300 border border-gray-200 rounded-xl text-gray-700 font-semibold text-[11px] text-left transition-all"
            >
              <span className="block text-[#991B1B] font-bold">Supervisor</span>
              <span className="text-[10px] text-gray-400">super123</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('budget_director', 'budget123')}
              className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 font-semibold text-[11px] text-left transition-all"
            >
              <span className="block text-amber-900 font-bold">Budget Director</span>
              <span className="text-[10px] text-amber-700">budget123</span>
            </button>
          </div>
        </div>
      </div>

      {/* Municipal Footer Tag */}
      <div className="mt-4 text-center text-xs text-white/90 font-medium">
        &copy; {new Date().getFullYear()} Ga South Municipal Assembly &bull; Ngleshie Amanfro Data Collection System
      </div>
    </div>
  );
}
