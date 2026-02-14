import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';

interface JobDetail {
  id: string;
  name: string;
  queue: string;
  status: string;
  data: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
}

export function AdminJobInspectorPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (jobId) fetchJob(); }, [jobId]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/admin/operations/jobs/${jobId}`, { credentials: 'include' });
      if (response.ok) setJob(await response.json());
    } catch (err) { console.error('Failed to fetch job:', err); }
    finally { setLoading(false); }
  };

  const handleAction = async (action: 'retry' | 'remove') => {
    try {
      await fetch(`/api/admin/operations/jobs/${jobId}/${action}`, { method: 'POST', credentials: 'include' });
      if (action === 'retry') fetchJob();
    } catch (err) { console.error(`Failed to ${action} job:`, err); }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading job details...</div>;
  if (!job) return <div className="p-8 text-gray-500">Job not found</div>;

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800', active: 'bg-blue-100 text-blue-800',
    waiting: 'bg-gray-100 text-gray-800', failed: 'bg-red-100 text-red-800', delayed: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/operations" className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Inspector</h1>
          <p className="text-gray-500">Job ID: {jobId}</p>
        </div>
        <div className="flex gap-2">
          {job.status === 'failed' && (
            <button onClick={() => handleAction('retry')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          )}
          <button onClick={() => handleAction('remove')} className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-200">
            <Trash2 className="w-4 h-4" /> Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Info</h3>
          <dl className="space-y-3">
            <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{job.name}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Queue</dt><dd className="font-medium">{job.queue}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[job.status] || ''}`}>{job.status}</span></dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Attempts</dt><dd>{job.attempts} / {job.maxAttempts}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd className="text-sm">{new Date(job.createdAt).toLocaleString()}</dd></div>
            {job.processedAt && <div className="flex justify-between"><dt className="text-gray-500">Processed</dt><dd className="text-sm">{new Date(job.processedAt).toLocaleString()}</dd></div>}
            {job.completedAt && <div className="flex justify-between"><dt className="text-gray-500">Completed</dt><dd className="text-sm">{new Date(job.completedAt).toLocaleString()}</dd></div>}
          </dl>
        </div>

        {job.error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">Error</h3>
            <pre className="text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap overflow-auto max-h-64">{job.error}</pre>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Data</h3>
        <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-64">{JSON.stringify(job.data, null, 2)}</pre>
      </div>

      {job.result && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Result</h3>
          <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-64">{JSON.stringify(job.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
