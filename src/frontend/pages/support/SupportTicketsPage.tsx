import { useEffect, useState } from 'react';
import { HelpCircle, Plus, Loader2, Send } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Label } from '../../components/ui/Label';
import { StatusDot } from '../../components/ui/StatusDot';

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export default function SupportTicketsPage() {
  const { success, error } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ tickets: Ticket[] }>('support/tickets');
      setTickets(data.tickets || []);
    } catch (err: any) {
      error(err.message || 'Failed to load tickets');
      setTickets([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      const data = await api.post('support/tickets', newTicket);
      setTickets([data.ticket, ...tickets]);
      setNewTicket({ subject: '', message: '', priority: 'medium' });
      setIsCreateModalOpen(false);
      success('Support ticket created successfully');
    } catch (err: any) {
      error(err.message || 'Failed to create ticket');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusInfo = (status: Ticket['status']) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return { status: 'success' as const, label: status };
      case 'in_progress':
        return { status: 'info' as const, label: 'In Progress' };
      default:
        return { status: 'pending' as const, label: status };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Support</h1>
          <p className="text-zinc-400 mt-1">Get help from our support team</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Support Tickets</h3>
            <p className="text-zinc-400 mb-6">Create a ticket to get help from our team</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => {
            const statusInfo = getStatusInfo(ticket.status);
            return (
              <Card key={ticket.id} className="hover:border-white/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{ticket.subject}</h3>
                        <StatusDot
                          status={statusInfo.status}
                          label={statusInfo.label}
                          size="sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4">
                        <div>
                          <p className="text-zinc-500">Priority</p>
                          <p className="text-white capitalize">{ticket.priority}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Created</p>
                          <p className="text-white">{formatDateTime(ticket.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Updated</p>
                          <p className="text-white">{formatDateTime(ticket.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Support Ticket"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue"
              value={newTicket.subject}
              onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Provide details about your issue..."
              value={newTicket.message}
              onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
              rows={5}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={newTicket.priority}
              onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
              className="w-full mt-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={createTicket}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
