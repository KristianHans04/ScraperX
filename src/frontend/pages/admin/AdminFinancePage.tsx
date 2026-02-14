import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, CreditCard, ArrowRight } from 'lucide-react';

export function AdminFinancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ mrr: 0, totalRevenue: 0, activeSubscriptions: 0, creditsSold: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/finance/overview', { credentials: 'include' });
        if (response.ok) setStats(await response.json());
      } catch (err) { console.error('Failed to fetch finance stats:', err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Monthly Recurring Revenue', value: `$${(stats.mrr / 100).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600 bg-green-100 dark:bg-green-900/30', link: '/admin/finance/subscriptions' },
    { label: 'Total Revenue', value: `$${(stats.totalRevenue / 100).toLocaleString()}`, icon: DollarSign, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', link: '/admin/finance/invoices' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions.toLocaleString(), icon: CreditCard, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30', link: '/admin/finance/subscriptions' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finance</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Revenue, subscriptions, and billing overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="Finance metrics">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.link} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${card.color}`}><Icon className="w-5 h-5" aria-hidden="true" /></div>
                <ArrowRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '-' : card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/finance/invoices" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">All Invoices</h3>
          <p className="text-sm text-gray-500">View and manage all invoices across accounts</p>
        </Link>
        <Link to="/admin/finance/credits" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Credit Ledger</h3>
          <p className="text-sm text-gray-500">View all credit transactions and allocations</p>
        </Link>
      </div>
    </div>
  );
}
