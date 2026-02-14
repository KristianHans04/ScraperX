import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function AdminAccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [activeTab, setActiveTab] = useState<'info' | 'usage' | 'billing' | 'keys' | 'jobs'>('info');

  const tabs = [
    { id: 'info' as const, label: 'Info' },
    { id: 'usage' as const, label: 'Usage' },
    { id: 'billing' as const, label: 'Billing' },
    { id: 'keys' as const, label: 'API Keys' },
    { id: 'jobs' as const, label: 'Jobs' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/accounts" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Detail</h1>
          <p className="text-gray-500">Account ID: {accountId}</p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-500 text-center py-8">
          {activeTab === 'info' && 'Account information, owner details, and settings will be displayed here'}
          {activeTab === 'usage' && 'Usage statistics, credit consumption, and API call history will be displayed here'}
          {activeTab === 'billing' && 'Subscription details, payment history, and invoices will be displayed here'}
          {activeTab === 'keys' && 'API key list with creation dates, last used, and status will be displayed here'}
          {activeTab === 'jobs' && 'Job history for this account with filtering options will be displayed here'}
        </p>
      </div>
    </div>
  );
}
