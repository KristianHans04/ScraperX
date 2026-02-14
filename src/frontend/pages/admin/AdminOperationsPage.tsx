import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Layers, Server, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';

interface OpsStats {
  activeJobs: number;
  queuedJobs: number;
  failedJobs24h: number;
  avgProcessingTime: number;
  uptime: number;
}

export function AdminOperationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OpsStats>({
    activeJobs: 0,
    queuedJobs: 0,
    failedJobs24h: 0,
    avgProcessingTime: 0,
    uptime: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/operations/overview', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load operations data');
      setStats(await response.json());
    } catch (err) {
      setError('Unable to load operations data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Per spec: exactly 3 stat cards
  const cards = [
    {
      label: 'Active Jobs',
      value: stats.activeJobs.toLocaleString(),
      icon: Activity,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Queued Jobs',
      value: stats.queuedJobs.toLocaleString(),
      icon: Layers,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Avg Processing Time',
      value: `${(stats.avgProcessingTime / 1000).toFixed(1)}s`,
      icon: Server,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-4" aria-hidden="true" />
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
          aria-label="Retry loading operations data"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Operations</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">System health, queues, and job processing</p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors self-start"
          aria-label="Refresh operations data"
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Stat Cards - exactly 3 per spec */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="Operations metrics">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              aria-label={`${card.label}: ${loading ? 'loading' : card.value}`}
            >
              <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '-' : card.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* System Health Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Uptime</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? '-' : `${stats.uptime.toFixed(2)}%`}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Failed Jobs (24h)</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? '-' : stats.failedJobs24h.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Processing</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? '-' : `${(stats.avgProcessingTime / 1000).toFixed(1)}s`}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/admin/operations/queues"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow flex items-center justify-between"
          aria-label="Navigate to queue monitor"
        >
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Queue Monitor</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage BullMQ job queues</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" aria-hidden="true" />
        </Link>
        <Link
          to="/admin/operations/errors"
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow flex items-center justify-between"
          aria-label="Navigate to error tracker"
        >
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Error Tracker</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and analyze system errors</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
