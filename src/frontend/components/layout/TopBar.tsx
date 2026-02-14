import { Link } from 'react-router-dom';
import { ThemeLogo } from '../ui/ThemeLogo';
import { Sun, Moon, Search, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { getInitials } from '../../lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const { user, account, logout } = useAuth();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
          <ThemeLogo height="72px" />
        </Link>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {}}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {user && (
          <div className="relative group">
            <button
              className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground h-9 w-9 text-sm font-medium hover:opacity-90"
              aria-label="User menu"
            >
              {getInitials(user.name)}
            </button>
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-card border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                {account && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Plan: {account.plan} | Credits: {account.creditBalance}
                  </p>
                )}
              </div>
              <div className="p-1">
                <Link
                  to="/dashboard/settings"
                  className="block px-3 py-2 text-sm hover:bg-accent rounded-md"
                >
                  Settings
                </Link>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
