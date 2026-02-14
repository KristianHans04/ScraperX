import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ChevronRight, Loader2 } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { error, success } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await login(formData.email, formData.password);
      success('Login successful!');
      
      // Redirect based on user role
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Login failed');
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
          <Link to="/" className="flex items-center mb-16 self-start group">
            <img
              src="/Logo/Name-Dark.svg"
              alt="Scrapifie"
              className="h-18 w-auto group-hover:opacity-80 transition-opacity"
            />
          </Link>

          <div className="mb-10">
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-silver-400 text-lg">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-sm w-full">
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-bold text-silver-300 uppercase tracking-wide">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-silver-400 hover:text-white transition-colors hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
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
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-xl bg-white text-black font-bold text-lg hover:bg-silver-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-silver-500 max-w-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-white font-medium hover:underline">
              Create free account
            </Link>
          </p>
        </div>

        {/* Right Side: Visual/Testimonial */}
        <div className="hidden lg:flex w-1/2 items-center justify-center p-8">
          <div className="w-full h-full bg-white/5 border border-white/10 rounded-3xl backdrop-blur-2xl relative overflow-hidden flex flex-col justify-end p-12">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            
            {/* Abstract visual */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl animate-pulse" />

            <div className="relative z-10">
              <div className="mb-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-yellow-400 text-2xl">★</span>
                ))}
              </div>
              <blockquote className="text-2xl font-medium text-white leading-relaxed mb-6">
                "Scrapifie transformed our data pipeline. The anti-bot evasion is simply unmatched in the industry."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-white border border-white/10">
                  JS
                </div>
                <div>
                  <div className="font-bold text-white">James Smith</div>
                  <div className="text-sm text-silver-400">CTO at DataFlow</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
