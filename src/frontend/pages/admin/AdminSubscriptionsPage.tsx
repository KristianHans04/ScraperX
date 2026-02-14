import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Subscription {
  id: string;
  accountEmail: string;
  plan: string;
  status: string;
  amount: number;
  startedAt: string;
  renewalDate: string;
}

export function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        const response = await fetch('/api/admin/finance/subscriptions', { credentials: 'include' });
        if (response.ok) { const data = await response.json(); setSubscriptions(data.subscriptions || []); }
      } catch (err) { console.error('Failed to fetch subscriptions:', err); }
      finally { setLoading(false); }
    };
    fetchSubs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/finance" className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">All active subscriptions</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renewal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{sub.accountEmail}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded capitalize">{sub.plan}</span></td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">${(sub.amount / 100).toFixed(2)}/mo</td>
                  <td className="px-6 py-4"><span className={`px-2.5 py-1 text-xs font-medium rounded-full ${sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{sub.status}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(sub.renewalDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
