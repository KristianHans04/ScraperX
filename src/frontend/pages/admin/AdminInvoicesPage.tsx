import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  accountEmail: string;
  amount: number;
  status: string;
  date: string;
}

export function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch('/api/admin/finance/invoices', { credentials: 'include' });
        if (response.ok) { const data = await response.json(); setInvoices(data.invoices || []); }
      } catch (err) { console.error('Failed to fetch invoices:', err); }
      finally { setLoading(false); }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/finance" className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Invoices</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Invoices across all accounts</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Loading...</div> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{inv.accountEmail}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">${(inv.amount / 100).toFixed(2)}</td>
                  <td className="px-6 py-4"><span className={`px-2.5 py-1 text-xs font-medium rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{inv.status}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(inv.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
