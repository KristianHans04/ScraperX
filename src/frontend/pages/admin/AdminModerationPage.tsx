import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Shield, Clock } from 'lucide-react';

interface Report {
  id: string;
  type: string;
  status: string;
  severity: string;
  accountEmail: string;
  reason: string;
  createdAt: string;
}

export function AdminModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => { fetchReports(); }, [statusFilter]);

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams({ status: statusFilter });
      const response = await fetch(`/api/admin/moderation?${params}`, { credentials: 'include' });
      if (response.ok) { const data = await response.json(); setReports(data.reports || []); }
    } catch (err) { console.error('Failed to fetch reports:', err); }
    finally { setLoading(false); }
  };

  const severityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Moderation Queue</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Review flagged accounts and abuse reports</p>
        </div>
        <div className="flex gap-2">
          {['pending', 'investigating', 'resolved', 'dismissed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${statusFilter === status ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              aria-label={`Filter by ${status}`}
              aria-pressed={statusFilter === status}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" aria-hidden="true" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No {statusFilter} reports</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {reports.map((report) => (
              <Link key={report.id} to={`/admin/moderation/${report.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-4">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${report.severity === 'critical' ? 'text-red-500' : report.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'}`} aria-hidden="true" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{report.reason}</p>
                    <p className="text-sm text-gray-500 mt-1">{report.accountEmail} - {report.type}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${severityColors[report.severity] || ''}`}>{report.severity}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" />{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
