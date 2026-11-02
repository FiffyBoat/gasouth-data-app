import React from 'react';
import { Link } from 'react-router-dom';
import { Target, CheckCircle2, TrendingUp, Plus, Sparkles, MapPin } from 'lucide-react';

export default function CollectorDailyQuota({ stats = {}, collectorName = '' }) {
  const todayCount = stats.today_count || 0;
  const target = stats.daily_target || 25;
  const pct = Math.min(Math.round((todayCount / target) * 100), 100);
  const remaining = Math.max(target - todayCount, 0);
  const isGoalReached = todayCount >= target;

  return (
    <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden border border-emerald-500/20">
      {/* Decorative ambient background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Info & Headline */}
        <div className="space-y-2 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-300" />
              Daily Field Mobilization Target
            </span>
            {isGoalReached && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Target Exceeded
              </span>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {todayCount} <span className="text-emerald-300 text-base font-normal">/ {target} units captured today</span>
          </h3>

          <p className="text-xs text-emerald-100/80 leading-relaxed">
            {isGoalReached
              ? 'Outstanding work! You have fulfilled your municipal field quota for today. Extra submissions will boost your assembly performance rating.'
              : `You are ${remaining} records away from hitting today's target of ${target} properties and businesses in your assigned sector.`}
          </p>
        </div>

        {/* Right: Progress Ring / Bar & CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-center min-w-[200px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-emerald-200 font-medium">Daily Quota Pace</span>
              <span className="font-bold text-white font-mono">{pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isGoalReached
                    ? 'bg-gradient-to-r from-amber-400 to-emerald-400'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-300'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-200/70">
              <span>{todayCount} completed</span>
              <span>{remaining > 0 ? `${remaining} remaining` : 'Goal achieved'}</span>
            </div>
          </div>

          <Link
            to="/capture"
            className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Capture Next Record</span>
          </Link>
        </div>
      </div>
    </div>
  );
}