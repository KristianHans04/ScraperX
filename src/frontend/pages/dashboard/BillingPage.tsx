import { useEffect, useState } from 'react';
import { CreditCard, DollarSign, Receipt, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusDot } from '../../components/ui/StatusDot';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
}

interface Invoice {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  createdAt: string;
  description: string;
}

interface BillingData {
  credits: number;
  plan: string;
  creditUsage: {
    current: number;
    limit: number;
  };
}

const creditPackages: CreditPackage[] = [
  { id: '1k', name: 'Starter', credits: 1000, price: 10 },
  { id: '5k', name: 'Growth', credits: 5000, price: 45, popular: true },
  { id: '10k', name: 'Business', credits: 10000, price: 80 },
  { id: '50k', name: 'Enterprise', credits: 50000, price: 350 },
];

export default function BillingPage() {
  const { success, error } = useToast();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadBillingData();
    loadInvoices();
  }, []);

  const loadBillingData = async () => {
    try {
      const data = await api.get('billing');
      setBillingData(data);
    } catch (err: any) {
      error(err.message || 'Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const data = await api.get<{ invoices: any[] }>('billing/invoices');
      setInvoices(data.invoices || []);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      setInvoices([]); // Set empty array on error
    }
  };

  const purchaseCredits = async (packageId: string) => {
    setIsPurchasing(true);
    try {
      await api.post('billing/credits/purchase', { packageId });
      success('Credits purchased successfully!');
      loadBillingData();
      loadInvoices();
    } catch (err: any) {
      error(err.message || 'Failed to purchase credits');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Billing</h1>
        <p className="text-zinc-400 mt-1">Manage your credits and billing</p>
      </div>

      {/* Current Balance */}
      <Card className="border-white/20 bg-gradient-to-br from-white/10 to-white/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400 mb-1">Available Credits</p>
              <p className="text-5xl font-bold text-white">
                {(billingData?.credits ?? (billingData as any)?.creditBalance)?.toLocaleString() ?? 0}
              </p>
              <p className="text-sm text-zinc-400 mt-2">
                Current Plan: <span className="text-white capitalize">{billingData?.plan || 'free'}</span>
              </p>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
              <CreditCard className="h-10 w-10 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Purchase Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {creditPackages.map((pkg) => (
            <Card
              key={pkg.id}
              className={
                pkg.popular
                  ? 'border-white/30 bg-white/10 hover:border-white/40'
                  : 'hover:border-white/30'
              }
            >
              <CardContent className="p-6">
                {pkg.popular && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-xs text-white font-medium border border-white/20">
                      <CheckCircle className="h-3 w-3" />
                      Popular
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-bold text-white mb-2">{pkg.name}</h3>
                <div className="mb-4">
                  <p className="text-3xl font-bold text-white">${pkg.price}</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    {pkg.credits.toLocaleString()} credits
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    ${(pkg.price / pkg.credits * 1000).toFixed(2)} per 1k credits
                  </p>
                </div>
                <Button
                  variant={pkg.popular ? 'primary' : 'secondary'}
                  className="w-full"
                  onClick={() => purchaseCredits(pkg.id)}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Purchase'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Invoices */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Recent Invoices</h2>
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Receipt className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No invoices yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {invoices.slice(0, 10).map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <StatusDot
                            status={
                              invoice.status === 'paid'
                                ? 'success'
                                : invoice.status === 'failed'
                                ? 'error'
                                : 'pending'
                            }
                            label={invoice.status}
                            size="sm"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white">{invoice.description}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white font-medium">
                            ${(invoice.amount / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-400">
                            {formatDateTime(invoice.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
