import { useEffect, useState } from 'react';
import { Copy, Plus, Trash2, Key, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  environment: 'development' | 'staging' | 'production';
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
  scopes: string[];
}

export default function ApiKeysPage() {
  const { success, error } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<'development' | 'production'>('development');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ keys: ApiKey[] }>('keys');
      setKeys(data.keys || []);
    } catch (err: any) {
      error(err.message || 'Failed to load API keys');
      setKeys([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const createKey = async () => {
    if (!newKeyName.trim()) {
      error('Please enter a key name');
      return;
    }

    setIsCreating(true);
    try {
      const data = await api.post('keys', {
        name: newKeyName,
        environment: newKeyEnvironment,
        scopes: ['scrape:read', 'scrape:write'],
      });
      setCreatedKey(data.rawKey);
      setKeys([data.apiKey, ...keys]);
      setNewKeyName('');
      success('API key created successfully');
    } catch (err: any) {
      error(err.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm('Revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/keys/${keyId}`);
      setKeys(keys.filter((k) => k.id !== keyId));
      success('API key revoked');
    } catch (err: any) {
      error(err.message || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-silver-200 to-silver-500">
            API Keys
          </h1>
          <p className="text-silver-400 mt-2">Manage authentication credentials</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Key
        </Button>
      </div>

      {/* Keys List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-12 text-center">
          <Key className="h-16 w-16 text-silver-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No API Keys</h2>
          <p className="text-silver-400 mb-6">Create your first key to start using the API</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Create Key
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 hover:border-white/20 hover:bg-white/[0.07] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Key Name & Status */}
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-bold text-white">{key.name}</h3>
                    {key.isActive ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <span className="text-xs text-green-400">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <span className="text-xs text-red-400">Revoked</span>
                      </div>
                    )}
                  </div>

                  {/* Key Display */}
                  <div className="flex items-center gap-2 mb-4">
                    <code className="px-4 py-2 rounded-xl bg-black/50 border border-white/10 text-sm text-silver-300 font-mono">
                      {key.keyPrefix}••••••••
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.keyPrefix)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-silver-400 hover:text-white transition-all border border-white/10 hover:border-white/20"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Key Metadata */}
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-silver-500 text-xs mb-1">Environment</p>
                      <p className="text-white font-mono capitalize text-sm">{key.environment}</p>
                    </div>
                    <div>
                      <p className="text-silver-500 text-xs mb-1">Created</p>
                      <p className="text-white text-sm">{formatDateTime(key.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-silver-500 text-xs mb-1">Last Used</p>
                      {key.lastUsedAt ? (
                        <p className="text-white text-sm">{formatDateTime(key.lastUsedAt)}</p>
                      ) : (
                        <p className="text-silver-500 text-sm">Never</p>
                      )}
                    </div>
                    <div>
                      <p className="text-silver-500 text-xs mb-1">Scopes</p>
                      <p className="text-white text-sm">{key.scopes.length} scopes</p>
                    </div>
                  </div>
                </div>

                {/* Revoke Button */}
                {key.isActive && (
                  <Button
                    variant="ghost"
                    onClick={() => revokeKey(key.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30 px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreatedKey(null);
          setNewKeyName('');
        }}
        title={createdKey ? 'API Key Created' : 'Create API Key'}
      >
        {createdKey ? (
          <div className="space-y-6">
            {/* Warning */}
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-400">Save your API key now</p>
                <p className="text-sm text-yellow-400/80 mt-1">You won't be able to see it again</p>
              </div>
            </div>

            {/* Key Display */}
            <div>
              <Label>Your API Key</Label>
              <div className="flex gap-2 mt-2">
                <code className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-sm break-all overflow-auto max-h-24">
                  {createdKey}
                </code>
                <Button
                  variant="secondary"
                  onClick={() => copyToClipboard(createdKey)}
                  className="px-3"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setIsCreateModalOpen(false);
                setCreatedKey(null);
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., Production API Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="environment">Environment</Label>
              <select
                id="environment"
                value={newKeyEnvironment}
                onChange={(e) => setNewKeyEnvironment(e.target.value as any)}
                className="w-full mt-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              >
                <option value="development">Development</option>
                <option value="production">Production</option>
              </select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={createKey}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Key'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
