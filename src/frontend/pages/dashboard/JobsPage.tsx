import { useEffect, useState } from 'react';
import { Loader2, ListChecks, RefreshCw, ExternalLink } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusDot } from '../../components/ui/StatusDot';

interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url: string;
  method: string;
  creditsCharged: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface JobsResponse {
  jobs: Job[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function JobsPage() {
  const { error } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadJobs();
  }, [pagination.page]);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<JobsResponse>(
        `jobs?page=${pagination.page}&limit=${pagination.limit}`
      );
      setJobs(data.jobs || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (err: any) {
      error(err.message || 'Failed to load jobs');
      setJobs([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return { status: 'success' as const, label: 'Completed' };
      case 'failed':
        return { status: 'error' as const, label: 'Failed' };
      case 'processing':
        return { status: 'info' as const, label: 'Processing' };
      default:
        return { status: 'pending' as const, label: 'Pending' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Jobs</h1>
          <p className="text-zinc-400 mt-1">
            {pagination.total} total job{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={loadJobs} variant="secondary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ListChecks className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Jobs Yet</h3>
            <p className="text-zinc-400 mb-6">Start scraping to see your jobs here</p>
            <Button variant="primary">View Documentation</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      URL
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Method
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Credits
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {jobs.map((job) => {
                    const statusInfo = getStatusInfo(job.status);
                    return (
                      <tr
                        key={job.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <StatusDot
                            status={statusInfo.status}
                            label={statusInfo.label}
                            size="sm"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-md">
                            <p className="text-sm text-white truncate">{job.url}</p>
                            {job.errorMessage && (
                              <p className="text-xs text-red-400 truncate mt-1">
                                {job.errorMessage}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-300 uppercase font-mono">
                            {job.method}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white">
                            {job.creditsCharged}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-400">
                            {formatDateTime(job.createdAt)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/dashboard/jobs/${job.id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                <p className="text-sm text-zinc-400">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
