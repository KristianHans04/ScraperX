import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Ban } from 'lucide-react';

interface ReportDetail {
  id: string;
  type: string;
  status: string;
  severity: string;
  reason: string;
  description: string;
  accountEmail: string;
  accountId: string;
  reportedBy: string;
  createdAt: string;
  evidence: string[];
}

export function AdminReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { if (reportId) fetchReport(); }, [reportId]);

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/admin/moderation/${reportId}`, { credentials: 'include' });
      if (response.ok) setReport(await response.json());
    } catch (err) { console.error('Failed to fetch report:', err); }
    finally { setLoading(false); }
  };

  const handleAction = async (action: 'resolve' | 'dismiss' | 'suspend') => {
    setActionLoading(true);
    try {
      await fetch(`/api/admin/moderation/${reportId}/${action}`, { method: 'POST', credentials: 'include' });
      fetchReport();
    } catch (err) { console.error(`Failed to ${action}:`, err); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!report) return <div className="p-8 text-gray-500">Report not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/moderation" className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Report Investigation</h1>
          <p className="text-gray-500">Report ID: {reportId}</p>
        </div>
        {report.status === 'pending' || report.status === 'investigating' ? (
          <div className="flex gap-2">
            <button onClick={() => handleAction('resolve')} disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-50">
              <CheckCircle className="w-4 h-4" /> Resolve
            </button>
            <button onClick={() => handleAction('dismiss')} disabled={actionLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-700 disabled:opacity-50">
              <XCircle className="w-4 h-4" /> Dismiss
            </button>
            <button onClick={() => handleAction('suspend')} disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-700 disabled:opacity-50">
              <Ban className="w-4 h-4" /> Suspend Account
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Report Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between"><dt className="text-gray-500">Type</dt><dd className="font-medium capitalize">{report.type}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Severity</dt><dd className="font-medium capitalize">{report.severity}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd className="font-medium capitalize">{report.status}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Reported</dt><dd>{new Date(report.createdAt).toLocaleString()}</dd></div>
          </dl>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account</h3>
          <dl className="space-y-3">
            <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{report.accountEmail}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Reason</dt><dd className="font-medium">{report.reason}</dd></div>
          </dl>
          <Link to={`/admin/accounts/${report.accountId}`} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline inline-block">
            View Account
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.description}</p>
      </div>
    </div>
  );
}
