import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';

interface ErrorEntry {
  id: string;
  type: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  jobId?: string;
}

export function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchErrors(); }, []);

  const fetchErrors = async () => {
    try {
      const response = await fetch('/api/admin/operations/errors', { credentials: 'include' });
      if (response.ok) { const data = await response.json(); setErrors(data.errors || []); }
    } catch (err) { console.error('Failed to fetch errors:', err); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/operations" className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Error Tracker</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">System errors grouped by type</p>
        </div>
        <button onClick={fetchErrors} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? <div className="p-8 text-center text-gray-500">Loading errors...</div> : errors.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No errors recorded</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {errors.map((error) => (
              <div key={error.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{error.type}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{error.message}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Count: <strong className="text-red-600">{error.count}</strong></span>
                        <span>First: {new Date(error.firstSeen).toLocaleString()}</span>
                        <span>Last: {new Date(error.lastSeen).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {error.jobId && (
                    <Link to={`/admin/operations/jobs/${error.jobId}`} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                      View Job <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
