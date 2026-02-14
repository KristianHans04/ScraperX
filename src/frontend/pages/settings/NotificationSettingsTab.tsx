import { useState, useEffect } from 'react';
import { Bell, Loader2, Save } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface NotificationPreferences {
  email: {
    jobCompleted: boolean;
    jobFailed: boolean;
    creditsLow: boolean;
    weeklyReport: boolean;
  };
  push: {
    jobCompleted: boolean;
    jobFailed: boolean;
    creditsLow: boolean;
  };
}

export default function NotificationSettingsTab() {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      jobCompleted: true,
      jobFailed: true,
      creditsLow: true,
      weeklyReport: false,
    },
    push: {
      jobCompleted: false,
      jobFailed: true,
      creditsLow: true,
    },
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<NotificationPreferences>('settings/notifications');
      setPreferences(data || preferences); // Use default if API returns null
    } catch (err: any) {
      error(err.message || 'Failed to load preferences');
      // Keep default preferences on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('settings/notifications', preferences);
      success('Notification preferences updated');
    } catch (err: any) {
      error(err.message || 'Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const notificationTypes = [
    { key: 'jobCompleted', label: 'Job Completed', description: 'When a scraping job finishes successfully' },
    { key: 'jobFailed', label: 'Job Failed', description: 'When a scraping job fails' },
    { key: 'creditsLow', label: 'Credits Low', description: 'When your credit balance is running low' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Email Notifications</h3>
            <div className="space-y-3">
              {notificationTypes.map((type) => (
                <label
                  key={type.key}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={preferences.email[type.key as keyof typeof preferences.email]}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        email: { ...preferences.email, [type.key]: e.target.checked },
                      })
                    }
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-white/20"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{type.label}</p>
                    <p className="text-xs text-zinc-500">{type.description}</p>
                  </div>
                </label>
              ))}
              <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.email.weeklyReport}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      email: { ...preferences.email, weeklyReport: e.target.checked },
                    })
                  }
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-white/20"
                />
                <div>
                  <p className="text-sm font-medium text-white">Weekly Report</p>
                  <p className="text-xs text-zinc-500">Receive a weekly summary of your usage</p>
                </div>
              </label>
            </div>
          </div>

          {/* Push Notifications */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Push Notifications</h3>
            <div className="space-y-3">
              {notificationTypes.map((type) => (
                <label
                  key={type.key}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={preferences.push[type.key as keyof typeof preferences.push]}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        push: { ...preferences.push, [type.key]: e.target.checked },
                      })
                    }
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-white/20"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{type.label}</p>
                    <p className="text-xs text-zinc-500">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
