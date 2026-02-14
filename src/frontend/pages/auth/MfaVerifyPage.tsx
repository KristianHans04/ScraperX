import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export function MfaVerifyPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackup, setUseBackup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code,
          type: useBackup ? 'backup' : 'totp',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid verification code');
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Two-factor authentication
            </h1>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {useBackup
              ? 'Enter one of your backup codes to sign in.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {useBackup ? 'Backup code' : 'Verification code'}
              </label>
              <input
                id="code"
                type="text"
                inputMode={useBackup ? 'text' : 'numeric'}
                maxLength={useBackup ? 12 : 6}
                value={code}
                onChange={(e) => setCode(useBackup ? e.target.value : e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={useBackup ? 'XXXX-XXXX' : '000000'}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setUseBackup(!useBackup);
                setCode('');
                setError('');
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {useBackup ? 'Use authenticator app instead' : 'Use a backup code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
