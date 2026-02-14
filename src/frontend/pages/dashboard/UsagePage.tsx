import { useEffect, useState } from 'react';
import { BarChart3, Loader2, TrendingUp, Activity } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface UsageData {
  totalRequests: number;
  totalCredits: number;
  successRate: number;
  avgResponseTime: number;
  dailyUsage: Array<{
    date: string;
    requests: number;
    credits: number;
  }>;
}

export default function UsagePage() {
  const { error } = useToast();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadUsage();
  }, [period]);

  const loadUsage = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<UsageData>(`/api/usage?period=${period}`);
      setUsage(data);
    } catch (err: any) {
      error(err.message || 'Failed to load usage data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Failed to load usage data</p>
        <Button onClick={loadUsage} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Usage Analytics</h1>
          <p className="text-zinc-400 mt-1">Monitor your API usage and performance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={period === '7d' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setPeriod('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={period === '30d' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setPeriod('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={period === '90d' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setPeriod('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:border-white/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Requests</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {usage.totalRequests.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <Activity className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-white/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Credits Used</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {usage.totalCredits.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-white/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Success Rate</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {usage.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-white/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Avg Response Time</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {usage.avgResponseTime}ms
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <Activity className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {usage.dailyUsage && usage.dailyUsage.length > 0 ? (
            <div className="space-y-4">
              {usage.dailyUsage.map((day, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-zinc-400">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-white/20 to-white/10 rounded-lg"
                        style={{
                          width: `${(day.requests / Math.max(...usage.dailyUsage.map(d => d.requests))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-32 text-right">
                    <p className="text-sm text-white font-medium">
                      {day.requests.toLocaleString()} requests
                    </p>
                    <p className="text-xs text-zinc-500">
                      {day.credits.toLocaleString()} credits
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No usage data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
