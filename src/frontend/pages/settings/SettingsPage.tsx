import { useState } from 'react';
import { User, Shield, Bell, Palette } from 'lucide-react';
import ProfileSettings from './ProfileSettings';
import SecuritySettings from './SecuritySettings';
import NotificationSettingsTab from './NotificationSettingsTab';
import AppearanceSettings from './AppearanceSettings';

type Tab = 'profile' | 'security' | 'notifications' | 'appearance';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'security' as Tab, label: 'Security', icon: Shield },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'appearance' as Tab, label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all
                  ${
                    isActive
                      ? 'border-white text-white'
                      : 'border-transparent text-zinc-400 hover:text-white hover:border-white/30'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'notifications' && <NotificationSettingsTab />}
        {activeTab === 'appearance' && <AppearanceSettings />}
      </div>
    </div>
  );
}
