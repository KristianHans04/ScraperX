import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
}

interface Message {
  id: string;
  userId: string;
  isStaff: boolean;
  message: string;
  createdAt: string;
}

export function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/support/tickets/${id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/support/tickets/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: reply }),
      });

      if (response.ok) {
        setReply('');
        fetchTicket();
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!id) return;
    try {
      await fetch(`/api/support/tickets/${id}/resolve`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchTicket();
    } catch (error) {
      console.error('Failed to resolve ticket:', error);
    }
  };

  if (!ticket) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/support/tickets"
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {ticket.subject}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Ticket #{ticket.ticketNumber}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded">
                {ticket.category}
              </span>
              <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">
                {ticket.status}
              </span>
            </div>
          </div>
          {ticket.status === 'open' && (
            <button
              onClick={handleResolve}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Mark as Resolved
            </button>
          )}
        </div>

        <div className="space-y-4 mb-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg ${
                msg.isStaff
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {msg.isStaff ? 'Support Team' : 'You'}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {msg.message}
              </p>
            </div>
          ))}
        </div>

        {ticket.status !== 'closed' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 mb-4"
            />
            <div className="flex justify-end">
              <button
                onClick={handleReply}
                disabled={loading || !reply.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
