import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ChevronRight, Loader2, Check } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { error, success } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );
      success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-black relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-white/5 blur-[150px] rounded-full pointer-events-none opacity-30" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-silver-500/10 blur-[150px] rounded-full pointer-events-none opacity-20" />

      {/* Main Container */}
      <div className="flex w-full max-w-7xl mx-auto relative z-10">
        
        {/* Left Side: Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12">
          
          {/* Logo */}
          <Link to="/" className="flex items-center mb-12 self-start group">
            <img
              src="/Logo/Name-Dark.svg"
              alt="Scrapifie"
              className="h-18 w-auto group-hover:opacity-80 transition-opacity"
            />
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              Create Account
            </h1>
            <p className="text-silver-400 text-lg">
              Start scraping with 1,000 free credits today.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-md w-full">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-bold text-silver-300 uppercase tracking-wide">
                  First Name
                </label>
                <input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-silver-600 focus:outline-none focus:border-white/30 focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-bold text-silver-300 uppercase tracking-wide">
                  Last Name
                </label>
                <input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-silver-600 focus:outline-none focus:border-white/30 focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold text-silver-300 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-silver-600 focus:outline-none focus:border-white/30 focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-bold text-silver-300 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-silver-600 focus:outline-none focus:border-white/30 focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <p className="text-xs text-silver-500 pl-1">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-bold text-silver-300 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-silver-600 focus:outline-none focus:border-white/30 focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-xl bg-white text-black font-bold text-lg hover:bg-silver-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Get Started
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-silver-500 max-w-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-white font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Right Side: Visual/Benefits */}
        <div className="hidden lg:flex w-1/2 items-center justify-center p-8">
          <div className="w-full h-full bg-white/5 border border-white/10 rounded-3xl backdrop-blur-2xl relative overflow-hidden flex flex-col justify-center p-16">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />
            
            {/* Visual Blob */}
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-white/5 to-transparent rounded-full blur-3xl" />

            <div className="relative z-10 space-y-8">
              <h2 className="text-3xl font-bold text-white mb-8">
                Why developers choose Scrapifie
              </h2>
              
              <div className="space-y-6">
                {[
                  "99.9% Success Rate on Enterprise Sites",
                  "Built-in Anti-Bot & Captcha Solving",
                  "Global Residential Proxy Network",
                  "Headless Browser & Javascript Rendering",
                  "Concurrent Requests & High Scalability"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/10">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-silver-200 text-lg">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
