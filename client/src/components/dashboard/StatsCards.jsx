import React from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  Flag,
  Crosshair,
  Building,
  ShieldCheck,
  Award,
  Target,
  /* FUTURE BILLING ICONS — uncomment when billing module is activated:
  Coins,
  Landmark,
  */
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function StatsCards({ stats = {} }) {
  const { user, hasRole } = useAuth();

  let cards = [];

  if (hasRole('budget_director')) {
    // Tailored directly for the Budget Director (Data Collection Mode)
    cards = [
      {
        label: 'Approved & Finalized',
        value: stats.approved_count || 0,
        icon: CheckCircle2,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        subtitle: 'Finalized field records',
      },
      {
        label: 'Awaiting Budget Sign-Off',
        value: stats.reviewed_count || 0,
        icon: Award,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        subtitle: `${stats.reviewed_count || 0} records awaiting your approval`,
      },
      {
        label: 'Supervisor Queue',
        value: stats.submitted_count || 0,
        icon: Clock,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        subtitle: 'Under initial field review',
      },
      {
        label: 'Total Mapped Units',
        value: stats.total_records || 0,
        icon: Building,
        color: 'text-gray-700 bg-gray-50 border-gray-200',
        subtitle: `${stats.property_count || 0} props, ${stats.business_count || 0} biz`,
      },
      {
        label: 'Draft Records',
        value: stats.draft_count || 0,
        icon: FileText,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        subtitle: 'Incomplete field drafts',
      },
      {
        label: 'Avg GPS Accuracy',
        value: stats.avg_accuracy_m ? `±${stats.avg_accuracy_m}m` : '—',
        icon: Crosshair,
        color: 'text-teal-700 bg-teal-50 border-teal-200',
        subtitle: 'Horizontal tolerance',
      },
      /* Future Billing & Revenue Cards (Commented out for data-collection-only phase)
      {
        label: 'Certified Revenue',
        value: `GH¢ ${(stats.approved_revenue_ghs || 0).toLocaleString()}`,
        icon: Coins,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        subtitle: 'Approved and certified',
      },
      {
        label: 'Rateable Valuation Base',
        value: `GH¢ ${(stats.total_rateable_value_ghs || 0).toLocaleString()}`,
        icon: Landmark,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        subtitle: 'Assessed property tax roll base',
      },
      */
    ];
  } else if (hasRole('supervisor')) {
    // Tailored for Data Supervisors
    cards = [
      {
        label: 'Supervisor Queue',
        value: stats.submitted_count || 0,
        icon: Clock,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        subtitle: 'Needs supervisor verification',
      },
      {
        label: 'Forwarded to Budget',
        value: stats.reviewed_count || 0,
        icon: ShieldCheck,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        subtitle: 'Endorsed for final approval',
      },
      {
        label: 'Certified & Approved',
        value: stats.approved_count || 0,
        icon: CheckCircle2,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        subtitle: 'Approved in system',
      },
      {
        label: 'Total Mapped Units',
        value: stats.total_records || 0,
        icon: Building,
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        subtitle: `${stats.property_count || 0} props, ${stats.business_count || 0} biz`,
      },
      {
        label: 'Anomalies & Flags',
        value: (stats.flagged_count || 0) + (stats.rejected_count || 0),
        icon: Flag,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        subtitle: `${stats.flagged_count || 0} flagged, ${stats.rejected_count || 0} rejected`,
      },
      {
        label: 'Avg GPS Accuracy',
        value: stats.avg_accuracy_m ? `±${stats.avg_accuracy_m}m` : '—',
        icon: Crosshair,
        color: 'text-teal-700 bg-teal-50 border-teal-200',
        subtitle: 'Horizontal tolerance',
      },
      /* Future Revenue Metric (Commented out for data-collection-only phase):
      {
        label: 'Revenue Potential',
        value: `GH¢ ${(stats.approved_revenue_ghs || 0).toLocaleString()}`,
        icon: Coins,
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        subtitle: 'Certified revenue value',
      },
      */
    ];
  } else if (hasRole('admin')) {
    // Comprehensive Admin view
    cards = [
      {
        label: 'Approved & Finalized',
        value: stats.approved_count || 0,
        icon: CheckCircle2,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        subtitle: 'Approved field records',
      },
      {
        label: 'Awaiting Budget Sign-Off',
        value: stats.reviewed_count || 0,
        icon: Award,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        subtitle: `${stats.reviewed_count || 0} pending approval`,
      },
      {
        label: 'Supervisor Queue',
        value: stats.submitted_count || 0,
        icon: Clock,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        subtitle: 'Under field verification',
      },
      {
        label: 'Total Geo-Records',
        value: stats.total_records || 0,
        icon: Building,
        color: 'text-gray-700 bg-gray-50 border-gray-200',
        subtitle: `${stats.property_count || 0} props, ${stats.business_count || 0} biz`,
      },
      {
        label: 'Draft Records',
        value: stats.draft_count || 0,
        icon: FileText,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        subtitle: 'Incomplete field drafts',
      },
      {
        label: 'Avg GPS Accuracy',
        value: stats.avg_accuracy_m ? `±${stats.avg_accuracy_m}m` : '—',
        icon: Crosshair,
        color: 'text-teal-700 bg-teal-50 border-teal-200',
        subtitle: 'Horizontal tolerance',
      },
      /* Future Revenue & Valuation Roll (Commented out for data collection phase):
      {
        label: 'Certified Revenue',
        value: `GH¢ ${(stats.approved_revenue_ghs || 0).toLocaleString()}`,
        icon: Coins,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        subtitle: 'Approved billing revenue',
      },
      {
        label: 'Rateable Valuation Base',
        value: `GH¢ ${(stats.total_rateable_value_ghs || 0).toLocaleString()}`,
        icon: Landmark,
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        subtitle: 'Assessed property roll',
      },
      */
    ];
  } else {
    // Collector view
    cards = [
      {
        label: 'Total Mapped',
        value: stats.total_records || 0,
        icon: FileText,
        color: 'text-primary-700 bg-primary-50 border-primary-200',
        subtitle: `${stats.property_count || 0} props, ${stats.business_count || 0} biz`,
      },
      {
        label: 'Approved & Certified',
        value: stats.approved_count || 0,
        icon: CheckCircle2,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        subtitle: 'Certified in system',
      },
      {
        label: 'Under Review',
        value: stats.pending_count || 0,
        icon: Clock,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        subtitle: `${stats.submitted_count || 0} supervisor, ${stats.reviewed_count || 0} budget`,
      },
      {
        label: "Today's Output",
        value: `${stats.today_count || 0} / ${stats.daily_target || 25}`,
        icon: Target,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        subtitle: `${Math.round(((stats.today_count || 0) / (stats.daily_target || 25)) * 100)}% of daily quota`,
      },
      {
        label: 'Correction Needed',
        value: stats.rejected_count || 0,
        icon: Flag,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        subtitle: 'Rejected by supervisor/budget',
      },
      {
        label: 'Avg GPS Accuracy',
        value: stats.avg_accuracy_m ? `±${stats.avg_accuracy_m}m` : '—',
        icon: Crosshair,
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        subtitle: 'Horizontal device precision',
      },
    ];
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg border ${card.color} shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight truncate">
                {card.value}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
