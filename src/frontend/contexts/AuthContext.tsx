import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  accountId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  role: string;
  timezone: string;
  dateFormat: string;
  theme: string;
  loginFailedCount: number;
  termsAcceptedAt?: string;
  termsVersion?: string;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  displayName: string;
  plan: string;
  creditBalance: number;
  creditCycleUsage: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  account: Account | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setAccount(data.account);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      // Use the specific error message from the API
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setAccount(data.account);
    return data; // Return the data so caller can access user role
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    setUser(null);
    setAccount(null);
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    const name = `${firstName} ${lastName}`.trim();
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      // Include validation details if available (e.g., password requirements)
      const errorMessage = error.error || 'Registration failed';
      const details = error.details 
        ? `\n${Array.isArray(error.details) ? error.details.map((d: any) => d.message || JSON.stringify(d)).join('\n') : JSON.stringify(error.details)}`
        : '';
      throw new Error(errorMessage + details);
    }

    const data = await response.json();
    setUser(data.user);
    setAccount(data.account);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
