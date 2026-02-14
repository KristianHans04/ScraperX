import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';
import { formatDateTime, formatNumber, formatDuration, formatBytes } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { JobDetail, JobLog } from '../../types';
import { ArrowLeft, RefreshCw, X, Download } from 'lucide-react';

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJob();
      loadLogs();
    }
  }, [jobId]);

  const loadJob = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<JobDetail>(`/jobs/${jobId}`);
      setJob(data);
    } catch (err) {
      error('Failed to load job');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await api.get<JobLog[]>(`/jobs/${jobId}/logs`);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs');
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const data = await api.post<{ jobId: string }>(`/jobs/${jobId}/retry`);
      success('Job retried successfully');
      navigate(`/dashboard/jobs/${data.jobId}`);
    } catch (err) {
      error('Failed to retry job');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this job?')) return;

    setIsCancelling(true);
    try {
      await api.post(`/jobs/${jobId}/cancel`);
      success('Job cancelled');
      loadJob();
    } catch (err) {
      error('Failed to cancel job');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadResult = () => {
    if (!job?.result) return;
    const blob = new Blob([job.result.content], { type: job.result.contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `result-${jobId}.${job.result.contentType === 'application/json' ? 'json' : 'html'}`;
    link.click();
  };

  const getStatusBadge = (status: JobDetail['status']) => {
    const variants: Record<JobDetail['status'], 'success' | 'destructive' | 'secondary' | 'default'> = {
      completed: 'success',
      failed: 'destructive',
      cancelled: 'destructive',
      running: 'default',
      pending: 'secondary',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getLogLevelColor = (level: JobLog['level']) => {
    const colors = {
      info: 'text-blue-600 dark:text-blue-400',
      warn: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400',
    };
    return colors[level];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Job not found</p>
        <Button onClick={() => navigate('/dashboard/jobs')} className="mt-4">
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/jobs')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Details</h1>
            <p className="text-muted-foreground">{job.url}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(job.status === 'failed' || job.status === 'cancelled') && (
            <Button onClick={handleRetry} disabled={isRetrying}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}
          {(job.status === 'pending' || job.status === 'running') && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              <X className="h-4 w-4 mr-2" />
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              {getStatusBadge(job.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engine</span>
              <span className="capitalize">{job.engine}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Credits Used</span>
              <span>{formatNumber(job.creditsUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>{job.duration ? formatDuration(job.duration) : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDateTime(job.createdAt)}</span>
            </div>
            {job.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span>{formatDateTime(job.completedAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retry Count</span>
              <span>{job.retryCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {job.result ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span>{formatBytes(job.result.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Content Type</span>
                  <span className="text-sm">{job.result.contentType}</span>
                </div>
                <Button onClick={handleDownloadResult} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Result
                </Button>
              </div>
            ) : job.error ? (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-900 dark:text-red-100">{job.error}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No result available yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>
            Execution logs for this job
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No logs available</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="flex gap-4 text-sm font-mono p-2 rounded hover:bg-accent"
                >
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={getLogLevelColor(log.level)}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {job.result && (
        <Card>
          <CardHeader>
            <CardTitle>Result Preview</CardTitle>
            <CardDescription>
              First 1000 characters of the scraped content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-96">
              {job.result.content.substring(0, 1000)}
              {job.result.content.length > 1000 && '...'}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
