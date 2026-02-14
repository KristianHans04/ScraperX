import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield, Ban, Mail } from 'lucide-react';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  role: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  lastLoginAt: string;
  creditsUsed: number;
  creditsRemaining: number;
  totalJobs: number;
  apiKeysCount: number;
}

export function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'billing'>('info');

  useEffect(() => {
    if (userId) fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { credentials: 'include' });
      if (response.ok) setUser(await response.json());
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return <div className="p-8 text-gray-500">User not found</div>;

  const tabs = [
    { id: 'info' as const, label: 'User Info' },
    { id: 'activity' as const, label: 'Activity' },
    { id: 'billing' as const, label: 'Billing' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/users" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600">
            <Mail className="w-4 h-4" /> Email User
          </button>
          <button className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-200 dark:hover:bg-red-900/50">
            <Ban className="w-4 h-4" /> Suspend
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd className="font-medium capitalize">{user.role}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Plan</dt><dd className="font-medium capitalize">{user.plan}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd className="font-medium capitalize">{user.status}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Email Verified</dt><dd>{user.emailVerified ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">MFA Enabled</dt><dd>{user.mfaEnabled ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Joined</dt><dd>{new Date(user.createdAt).toLocaleDateString()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Last Login</dt><dd>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</dd></div>
            </dl>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage Summary</h3>
            <dl className="space-y-3">
              <div className="flex justify-between"><dt className="text-gray-500">Credits Used</dt><dd className="font-medium">{user.creditsUsed.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Credits Remaining</dt><dd className="font-medium">{user.creditsRemaining.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Total Jobs</dt><dd className="font-medium">{user.totalJobs.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">API Keys</dt><dd className="font-medium">{user.apiKeysCount}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-500 text-center py-8">Activity log will be loaded from the audit system</p>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-500 text-center py-8">Billing details for this user will be displayed here</p>
        </div>
      )}
    </div>
  );
}
