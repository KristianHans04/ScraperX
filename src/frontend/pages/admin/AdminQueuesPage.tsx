import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Trash2, RefreshCw } from 'lucide-react';

interface Queue {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export function AdminQueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchQueues(); }, []);

  const fetchQueues = async () => {
    try {
      const response = await fetch('/api/admin/operations/queues', { credentials: 'include' });
      if (response.ok) { const data = await response.json(); setQueues(data.queues || []); }
    } catch (err) { console.error('Failed to fetch queues:', err); }
    finally { setLoading(false); }
  };

  const handleAction = async (queueName: string, action: 'pause' | 'resume' | 'clean') => {
    try {
      await fetch(`/api/admin/operations/queues/${queueName}/${action}`, { method: 'POST', credentials: 'include' });
      fetchQueues();
    } catch (err) { console.error(`Failed to ${action} queue:`, err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/operations" className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Queue Monitor</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">BullMQ queue status and management</p>
        </div>
        <button onClick={fetchQueues} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {loading ? <div className="p-8 text-center text-gray-500">Loading queues...</div> : queues.map((queue) => (
          <div key={queue.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{queue.name}</h3>
                {queue.paused && <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Paused</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAction(queue.name, queue.paused ? 'resume' : 'pause')}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title={queue.paused ? 'Resume' : 'Pause'}>
                  {queue.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <button onClick={() => handleAction(queue.name, 'clean')}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Clean completed">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div><p className="text-2xl font-bold text-green-600">{queue.active}</p><p className="text-xs text-gray-500">Active</p></div>
              <div><p className="text-2xl font-bold text-blue-600">{queue.waiting}</p><p className="text-xs text-gray-500">Waiting</p></div>
              <div><p className="text-2xl font-bold text-gray-600">{queue.completed}</p><p className="text-xs text-gray-500">Completed</p></div>
              <div><p className="text-2xl font-bold text-red-600">{queue.failed}</p><p className="text-xs text-gray-500">Failed</p></div>
              <div><p className="text-2xl font-bold text-yellow-600">{queue.delayed}</p><p className="text-xs text-gray-500">Delayed</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
