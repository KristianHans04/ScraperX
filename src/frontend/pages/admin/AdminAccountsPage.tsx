import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  ownerEmail: string;
  plan: string;
  status: string;
  usersCount: number;
  createdAt: string;
}

export function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/admin/accounts', { credentials: 'include' });
      if (response.ok) { const data = await response.json(); setAccounts(data.accounts || []); }
    } catch (err) { console.error('Failed to fetch accounts:', err); }
    finally { setLoading(false); }
  };

  const filtered = accounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) || a.ownerEmail.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Management</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">All registered accounts on the platform</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading accounts...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">{account.name}</p>
                    <p className="text-sm text-gray-500">{account.ownerEmail}</p>
                  </td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded capitalize">{account.plan}</span></td>
                  <td className="px-6 py-4"><span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[account.status] || ''}`}>{account.status}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{account.usersCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(account.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right"><Link to={`/admin/accounts/${account.id}`}><ChevronRight className="w-5 h-5 text-gray-400" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
