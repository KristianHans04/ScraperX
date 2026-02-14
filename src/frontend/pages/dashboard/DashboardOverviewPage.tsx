import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CreditCard,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../lib/api';
import { StatusDot } from '../../components/ui/StatusDot';
import { Button } from '../../components/ui/Button';

interface DashboardStats {
  stats: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalRequests: number;
    creditsUsed: number;
    apiKeysCount: number;
  };
  account: {
    email: string;
    credits: number;
    plan: string;
  };
  recentJobs?: Array<{
    id: string;
    status: string;
    url: string;
    createdAt: string;
    creditsCharged: number;
  }>;
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.get('dashboard');
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="h-12 w-12 text-red-400" />
        <p className="text-silver-400">{error || 'Failed to load dashboard'}</p>
        <Button onClick={fetchDashboard}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Credits */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-silver-200 to-silver-500">
            Welcome back
          </h1>
          <p className="text-silver-400 mt-2">{stats.account.email}</p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 hover:border-white/20 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-silver-500">Available Credits</p>
              <p className="text-3xl font-bold text-white">{stats.account.credits.toLocaleString()}</p>
            </div>
          </div>
          <Link to="/dashboard/billing" className="block mt-4">
            <Button variant="secondary" size="sm" className="w-full">
              Buy More
            </Button>
          </Link>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-6 gap-4 auto-rows-[140px]">
        {/* Active Jobs - spans 2 columns */}
        <div className="col-span-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 hover:border-white/20 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-blue-400" />
            <p className="text-sm text-silver-400">Active Jobs</p>
          </div>
          <p className="text-4xl font-bold text-white">{stats.stats.activeJobs}</p>
          <p className="text-xs text-silver-500 mt-2">Currently processing</p>
        </div>

        {/* Completed - spans 2 columns */}
        <div className="col-span-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 hover:border-white/20 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-sm text-silver-400">Completed</p>
          </div>
          <p className="text-4xl font-bold text-white">{stats.stats.completedJobs}</p>
          <p className="text-xs text-silver-500 mt-2">Successful jobs</p>
        </div>

        {/* Credits Used - spans 2 columns */}
        <div className="col-span-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 hover:border-white/20 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-silver-400" />
            <p className="text-sm text-silver-400">Credits Used</p>
          </div>
          <p className="text-4xl font-bold text-white">{stats.stats.creditsUsed.toLocaleString()}</p>
          <p className="text-xs text-silver-500 mt-2">This period</p>
        </div>

        {/* Recent Jobs - spans 4 columns, 2 rows */}
        <div className="col-span-4 row-span-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Recent Jobs</h2>
            <Link to="/dashboard/jobs">
              <Button variant="ghost" size="sm" className="text-silver-400 hover:text-white">
                View All →
              </Button>
            </Link>
          </div>
          
          {!stats.recentJobs || stats.recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100%-4rem)]">
              <Activity className="h-10 w-10 text-silver-600 mb-3" />
              <p className="text-silver-400 text-sm">No jobs yet</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[240px]">
              {stats.recentJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <StatusDot
                      status={
                        job.status === 'completed'
                          ? 'success'
                          : job.status === 'failed'
                          ? 'error'
                          : job.status === 'processing'
                          ? 'info'
                          : 'pending'
                      }
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate font-mono">{job.url}</p>
                      <p className="text-xs text-silver-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-silver-400">{job.creditsCharged}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total Jobs - spans 2 columns */}
        <div className="col-span-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 hover:border-white/20 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-5 w-5 text-silver-400" />
            <p className="text-sm text-silver-400">Total Jobs</p>
          </div>
          <p className="text-4xl font-bold text-white">{stats.stats.totalJobs}</p>
          <p className="text-xs text-silver-500 mt-2">All time</p>
        </div>
      </div>
    </div>
  );
}
