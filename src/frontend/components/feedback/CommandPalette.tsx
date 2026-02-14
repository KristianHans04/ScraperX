import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Search, LayoutDashboard, Key, ListChecks, BarChart3, CreditCard, Settings, HelpCircle } from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const commands: CommandItem[] = [
  {
    id: 'overview',
    title: 'Dashboard Overview',
    description: 'View your account overview',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'keys',
    title: 'API Keys',
    description: 'Manage your API keys',
    path: '/dashboard/keys',
    icon: Key,
  },
  {
    id: 'jobs',
    title: 'Jobs',
    description: 'View and manage your jobs',
    path: '/dashboard/jobs',
    icon: ListChecks,
  },
  {
    id: 'usage',
    title: 'Usage & Analytics',
    description: 'View usage statistics',
    path: '/dashboard/usage',
    icon: BarChart3,
  },
  {
    id: 'billing',
    title: 'Billing',
    description: 'Manage billing and payments',
    path: '/dashboard/billing',
    icon: CreditCard,
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Account settings',
    path: '/dashboard/settings',
    icon: Settings,
  },
  {
    id: 'support',
    title: 'Support',
    description: 'Get help and support',
    path: '/dashboard/support',
    icon: HelpCircle,
  },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback(
    (path: string) => {
      setIsOpen(false);
      setSearch('');
      setSelectedIndex(0);
      navigate(path);
    },
    [navigate]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (!isOpen) return;

      // Close with Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
        setSelectedIndex(0);
        return;
      }

      // Navigate with arrows
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelect(filteredCommands[selectedIndex].path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, handleSelect]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {filteredCommands.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No commands found
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filteredCommands.map((command, index) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.id}
                  onClick={() => handleSelect(command.path)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{command.title}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {command.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Use ↑↓ to navigate</span>
          <span>Enter to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </Modal>
  );
}
