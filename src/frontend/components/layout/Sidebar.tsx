import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Key,
  ListChecks,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'API Keys', href: '/dashboard/keys', icon: Key },
  { name: 'Jobs', href: '/dashboard/jobs', icon: ListChecks },
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Support', href: '/dashboard/support', icon: HelpCircle },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64',
          'bg-black/50 backdrop-blur-xl border-r border-white/10',
          'transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0 lg:static',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-white/10 lg:hidden">
            <img
              src="/Logo/Name-Dark.svg"
              alt="Scrapifie"
              className="h-18 w-auto"
            />
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                              (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer glow effect */}
          <div className="relative p-6">
            <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
          </div>
        </div>
      </aside>
    </>
  );
}
