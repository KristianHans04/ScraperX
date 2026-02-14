import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Copy, CheckCircle } from 'lucide-react';

export function MfaSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useState(() => {
    initMfaSetup();
  });

  const initMfaSetup = async () => {
    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
      }
    } catch (err) {
      console.error('Failed to init MFA setup:', err);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/mfa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid code');
      }

      const data = await response.json();
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Set up two-factor authentication
            </h1>
          </div>

          {step === 'qr' && (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy).
              </p>

              {qrCode ? (
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-white rounded-lg border">
                    <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                  </div>
                </div>
              ) : (
                <div className="flex justify-center mb-6">
                  <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
              )}

              {secret && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Or enter this secret manually:
                  </p>
                  <code className="block p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono text-center break-all">
                    {secret}
                  </code>
                </div>
              )}

              <button
                onClick={() => setStep('verify')}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                I have scanned the code
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Enter the 6-digit code from your authenticator app to verify setup.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={verifyCode} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Verification code
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify and enable'}
                </button>
              </form>
            </>
          )}

          {step === 'backup' && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Two-factor authentication is now enabled. Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator.
              </p>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((c, i) => (
                    <code key={i} className="font-mono text-sm text-center py-1">
                      {c}
                    </code>
                  ))}
                </div>
              </div>

              <button
                onClick={copyBackupCodes}
                className="w-full py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors flex items-center justify-center gap-2 mb-4"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy backup codes'}
              </button>

              <Link
                to="/dashboard/settings"
                className="block w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-center"
              >
                Done
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
