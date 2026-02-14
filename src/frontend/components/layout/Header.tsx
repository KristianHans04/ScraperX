import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, User, LogOut, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { account, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="text-zinc-400 hover:text-white transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link
            to="/dashboard"
            className="hidden lg:block"
          >
            <img
              src="/Logo/Name-Dark.svg"
              alt="Scrapifie"
              className="h-18 w-auto"
            />
          </Link>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Credits */}
          {account && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <CreditCard className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-white">
                {(account.credits || 0).toLocaleString()} credits
              </span>
            </div>
          )}

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white hidden md:block">
                {account?.email}
              </span>
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 z-50 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-xs text-zinc-500">Signed in as</p>
                    <p className="text-sm text-white font-medium truncate">
                      {account?.email}
                    </p>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/dashboard/settings"
                      className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
