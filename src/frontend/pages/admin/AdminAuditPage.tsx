import { useState, useEffect } from 'react';
import { ScrollText, Filter, Search } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  actorEmail: string;
  target: string;
  targetId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => { fetchAuditLog(); }, [actionFilter]);

  const fetchAuditLog = async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (actionFilter !== 'all') params.append('action', actionFilter);

      const response = await fetch(`/api/admin/audit?${params}`, { credentials: 'include' });
      if (response.ok) { const data = await response.json(); setEntries(data.entries || []); }
    } catch (err) { console.error('Failed to fetch audit log:', err); }
    finally { setLoading(false); }
  };

  const filtered = entries.filter((e) =>
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    e.actorEmail.toLowerCase().includes(search.toLowerCase()) ||
    e.details.toLowerCase().includes(search.toLowerCase())
  );

  const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    login: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    suspend: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Track all administrative actions across the platform</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audit log..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="suspend">Suspend</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Loading audit log...</div> : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No audit entries found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${actionColors[entry.action] || 'bg-gray-100 text-gray-800'}`}>{entry.action}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{entry.actorEmail}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.target}: {entry.targetId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{entry.details}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{entry.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
