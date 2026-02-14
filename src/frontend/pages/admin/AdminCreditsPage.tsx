import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface CreditTransaction {
  id: string;
  accountEmail: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export function AdminCreditsPage() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch('/api/admin/finance/credits', { credentials: 'include' });
        if (response.ok) { const data = await response.json(); setTransactions(data.transactions || []); }
      } catch (err) { console.error('Failed to fetch credit ledger:', err); }
      finally { setLoading(false); }
    };
    fetchCredits();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/finance" className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Credit Ledger</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">All credit transactions across accounts</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{tx.accountEmail}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded ${tx.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{tx.type}</span></td>
                  <td className="px-6 py-4 font-mono text-sm">{tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-sm">{tx.balance.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tx.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
