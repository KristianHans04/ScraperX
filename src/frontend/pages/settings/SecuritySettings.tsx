import { useState, useEffect } from 'react';
import { Shield, Smartphone, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface Session {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SecuritySettings() {
  const { success, error } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('settings/sessions');
      setSessions(data.sessions || []);
    } catch (err: any) {
      error(err.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await api.delete(`settings/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      success('Session revoked successfully');
    } catch (err: any) {
      error(err.message || 'Failed to revoke session');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            Manage your account security and active sessions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-zinc-400">No active sessions</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{session.device}</p>
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {session.location} • {session.ipAddress}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Last active {formatDateTime(session.lastActive)}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeSession(session.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
