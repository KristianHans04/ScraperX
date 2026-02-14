import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, Activity, AlertTriangle, ArrowUpRight, RefreshCw } from 'lucide-react';

interface OverviewStats {
  totalUsers: number;
  newUsersToday: number;
  activeJobs: number;
  queuedJobs: number;
  processingJobs: number;
  revenueMtd: number;
  revenueTodayDelta: number;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  link: string;
  count?: number;
}

interface ActivityEvent {
  id: string;
  time: string;
  event: string;
  userEmail: string;
  userId: string;
  details: string;
}

export function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchOverview();
  }, [timeRange]);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range: timeRange });
      const response = await fetch(`/api/admin/overview?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load admin overview');
      const data = await response.json();
      setStats(data.stats || null);
      setAlerts(data.alerts || []);
      setRecentActivity(data.recentActivity || []);
    } catch (err) {
      setError('Unable to load admin overview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const timeRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'mtd', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
  ];

  // Per spec: exactly 3 stat cards (Total Users, Active Jobs, Revenue MTD)
  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers?.toLocaleString() || '0',
      secondary: stats?.newUsersToday ? `+${stats.newUsersToday} today` : undefined,
      icon: Users,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
      link: '/admin/users',
    },
    {
      label: 'Active Jobs',
      value: stats?.activeJobs?.toLocaleString() || '0',
      secondary: stats ? `${stats.queuedJobs || 0} queued, ${stats.processingJobs || 0} processing` : undefined,
      icon: Activity,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
      link: '/admin/operations',
    },
    {
      label: 'Revenue (MTD)',
      value: `$${((stats?.revenueMtd || 0) / 100).toLocaleString()}`,
      secondary: stats?.revenueTodayDelta ? `+$${(stats.revenueTodayDelta / 100).toLocaleString()} today` : undefined,
      icon: DollarSign,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      link: '/admin/finance',
    },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-4" aria-hidden="true" />
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">{error}</p>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
          aria-label="Retry loading admin overview"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with time range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Overview</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Platform health and key metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="time-range-select" className="sr-only">Time range</label>
          <select
            id="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            {timeRangeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={fetchOverview}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Refresh overview data"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Stat Cards - exactly 3 per spec */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="Key platform metrics">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.link}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow group"
              aria-label={`${card.label}: ${loading ? 'loading' : card.value}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '-' : card.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
              {card.secondary && !loading && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.secondary}</p>
              )}
            </Link>
          );
        })}
      </div>

      {/* Charts placeholder - Registrations and Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Registrations</h2>
          <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            Chart will render with data from the API
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue</h2>
          <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            Chart will render with data from the API
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          <Link to="/admin/audit" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View All
          </Link>
        </div>
        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading activity...</div>
        ) : recentActivity.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No recent activity to display.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Recent platform activity">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentActivity.map((event) => (
                  <tr key={event.id}>
                    <td className="py-3 text-sm text-gray-500">{event.time}</td>
                    <td className="py-3 text-sm text-gray-900 dark:text-white">{event.event}</td>
                    <td className="py-3 text-sm">
                      <Link to={`/admin/users/${event.userId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {event.userEmail}
                      </Link>
                    </td>
                    <td className="py-3 text-sm text-gray-500">{event.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alerts and Warnings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alerts and Warnings</h2>
        {loading ? (
          <div className="py-4 text-center text-gray-500 dark:text-gray-400">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-green-600 dark:text-green-400 text-center py-4">
            No alerts. Everything looks good.
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                to={alert.link}
                className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {alert.message}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-amber-600" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
