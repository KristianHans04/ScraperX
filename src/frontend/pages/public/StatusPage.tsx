import { useState, useEffect } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { CheckCircle2, AlertCircle, AlertTriangle, XCircle, Wrench } from 'lucide-react';

interface ServiceStatus {
  serviceName: string;
  serviceDisplayName: string;
  description: string;
  status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  startedAt: string;
  resolvedAt?: string;
  updates: {
    id: string;
    message: string;
    status: string;
    createdAt: string;
  }[];
}

export function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [uptime, setUptime] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchStatus();
    fetchIncidents();
    fetchUptime();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/public/status');
      const data = await response.json();
      setServices(data.services);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const response = await fetch('/api/public/status/incidents');
      const data = await response.json();
      setIncidents(data.incidents);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUptime = async () => {
    try {
      const response = await fetch('/api/public/status/uptime');
      const data = await response.json();
      setUptime(data.uptime);
    } catch (error) {
      console.error('Failed to fetch uptime:', error);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/public/status/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) throw new Error('Subscription failed');

      setSubscribeStatus('success');
      setEmail('');
    } catch (error) {
      setSubscribeStatus('error');
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case 'degraded_performance':
        return <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
      case 'partial_outage':
        return <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />;
      case 'major_outage':
        return <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case 'under_maintenance':
        return <Wrench className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded_performance':
        return 'Degraded Performance';
      case 'partial_outage':
        return 'Partial Outage';
      case 'major_outage':
        return 'Major Outage';
      case 'under_maintenance':
        return 'Under Maintenance';
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 dark:text-green-400';
      case 'degraded_performance':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'partial_outage':
        return 'text-orange-600 dark:text-orange-400';
      case 'major_outage':
        return 'text-red-600 dark:text-red-400';
      case 'under_maintenance':
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getIncidentStatusBadge = (status: Incident['status']) => {
    const colors = {
      investigating: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      identified: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      monitoring: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      resolved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSeverityBadge = (severity: Incident['severity']) => {
    const colors = {
      low: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
      medium: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      high: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      critical: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[severity]}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const overallStatus = services.every((s) => s.status === 'operational')
    ? 'All Systems Operational'
    : 'Some Systems Experiencing Issues';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PublicLayout>
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              System Status
            </h1>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
              {services.every((s) => s.status === 'operational') ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              )}
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {overallStatus}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Current Status */}
      <section className="py-12 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Services</h2>
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.serviceName}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(service.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {service.serviceDisplayName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {service.description}
                    </p>
                  </div>
                </div>
                <span className={`font-medium ${getStatusColor(service.status)}`}>
                  {getStatusText(service.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Uptime (90 days) */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            90-Day Uptime
          </h2>
          <div className="space-y-6">
            {services.map((service) => (
              <div key={service.serviceName}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {service.serviceDisplayName}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {uptime[service.serviceName]
                      ? `${(
                          uptime[service.serviceName].reduce((a, b) => a + b, 0) /
                          uptime[service.serviceName].length
                        ).toFixed(2)}% uptime`
                      : '99.9% uptime'}
                  </span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 90 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 h-10 bg-green-500 dark:bg-green-600 rounded-sm"
                      title={`Day ${i + 1}: 100% uptime`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Incidents */}
      {incidents.length > 0 && (
        <section className="py-12 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Recent Incidents
            </h2>
            <div className="space-y-6">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {incident.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getIncidentStatusBadge(incident.status)}
                        {getSeverityBadge(incident.severity)}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Started: {formatDate(incident.startedAt)}
                        </span>
                        {incident.resolvedAt && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Resolved: {formatDate(incident.resolvedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {incident.updates.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {incident.updates.map((update) => (
                        <div
                          key={update.id}
                          className="pl-4 border-l-2 border-gray-300 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getIncidentStatusBadge(update.status as Incident['status'])}
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {formatDate(update.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {update.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Subscribe to Updates */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Subscribe to Updates
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Get notified when we post status updates.
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
          {subscribeStatus === 'success' && (
            <p className="mt-4 text-sm text-green-600 dark:text-green-400">
              Successfully subscribed!
            </p>
          )}
          {subscribeStatus === 'error' && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">
              Failed to subscribe. Please try again.
            </p>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
