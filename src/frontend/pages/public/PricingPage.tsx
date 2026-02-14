import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Check, X } from 'lucide-react';
import { FAQSection } from '../../components/public/FAQSection';

export function PricingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const billingParam = searchParams.get('billing');
    if (billingParam === 'annual') {
      setBilling('annual');
    }
  }, [searchParams]);

  const handleBillingToggle = (value: 'monthly' | 'annual') => {
    setBilling(value);
    setSearchParams({ billing: value });
  };

  const features = [
    {
      category: 'Engines & Access',
      items: [
        { name: 'HTTP Engine', free: true, pro: true, enterprise: true },
        { name: 'Browser Engine (Headless)', free: false, pro: true, enterprise: true },
        { name: 'Stealth Engine (Anti-Detect)', free: false, pro: true, enterprise: true },
        { name: 'API Access', free: true, pro: true, enterprise: true },
      ],
    },
    {
      category: 'Limits & Performance',
      items: [
        { name: 'Monthly Credits', free: '1,000', pro: '10,000', enterprise: 'Custom' },
        { name: 'Concurrent Requests', free: '2', pro: '20', enterprise: 'Unlimited' },
        { name: 'Rate Limit (req/min)', free: '10', pro: '100', enterprise: 'Custom' },
        { name: 'Data Retention', free: '7 days', pro: '90 days', enterprise: 'Unlimited' },
      ],
    },
    {
      category: 'Advanced Features',
      items: [
        { name: 'Smart Proxy Rotation', free: false, pro: true, enterprise: true },
        { name: 'Premium Residential Proxies', free: false, pro: true, enterprise: true },
        { name: 'CAPTCHA Solving', free: false, pro: false, enterprise: true },
        { name: 'Webhook Notifications', free: false, pro: true, enterprise: true },
        { name: 'Custom Headers & Cookies', free: true, pro: true, enterprise: true },
      ],
    },
    {
      category: 'Support & Security',
      items: [
        { name: 'Community Support', free: true, pro: true, enterprise: true },
        { name: 'Priority Email Support', free: false, pro: true, enterprise: true },
        { name: 'Dedicated Account Manager', free: false, pro: false, enterprise: true },
        { name: 'SLA Guarantee', free: false, pro: false, enterprise: '99.99%' },
        { name: 'SSO / SAML', free: false, pro: false, enterprise: true },
      ],
    },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-white mx-auto" />
      ) : (
        <X className="w-5 h-5 text-white/20 mx-auto" />
      );
    }
    return <span className="text-sm font-medium text-silver-200">{value}</span>;
  };

  return (
    <PublicLayout>
      <section className="bg-black min-h-screen relative overflow-hidden pt-32 pb-20">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header */}
          <div className="text-center mb-20">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tighter drop-shadow-2xl">
              Simple, Transparent <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-silver-200 to-silver-500">Subscriptions</span>
            </h1>
            <p className="text-xl text-silver-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Start for free, upgrade as you scale. No hidden fees or complicated credit math.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full p-1.5 shadow-inner backdrop-blur-md">
              <button
                onClick={() => handleBillingToggle('monthly')}
                className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  billing === 'monthly'
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'text-silver-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => handleBillingToggle('annual')}
                className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 relative ${
                  billing === 'annual'
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'text-silver-400 hover:text-white'
                }`}
              >
                Annual
                <span className="absolute -top-3 -right-3 bg-[#22c55e] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-black/20 shadow-md">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* Sticky Table Header Container */}
          <div className="relative">
            {/* The table container */}
            <div className="border border-white/10 rounded-3xl overflow-hidden bg-black/40 backdrop-blur-xl shadow-2xl ring-1 ring-white/5">
              <table className="w-full min-w-[900px] border-collapse">
                
                {/* Sticky Header */}
                <thead className="sticky top-[80px] z-40 bg-black/95 backdrop-blur-xl shadow-lg border-b border-white/10">
                  <tr>
                    <th className="text-left p-8 w-1/4">
                      <span className="text-lg font-bold text-white">Compare Plans</span>
                    </th>
                    
                    {/* Free Plan Header */}
                    <th className="p-8 w-1/4 align-top">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-white mb-2">Free</span>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-3xl font-bold text-white">$0</span>
                          <span className="text-sm text-silver-500">/mo</span>
                        </div>
                        <Link to="/register" className="w-full py-2.5 rounded-xl border border-white/20 text-white font-medium text-sm hover:bg-white hover:text-black transition-all text-center">
                          Get Started
                        </Link>
                      </div>
                    </th>

                    {/* Pro Plan Header */}
                    <th className="p-8 w-1/4 align-top relative bg-white/5 border-x border-white/10">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                         <span className="bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] uppercase tracking-wide">
                            Most Popular
                         </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-white mb-2">Pro</span>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-3xl font-bold text-white">
                            {billing === 'monthly' ? '$49' : '$39'}
                          </span>
                          <span className="text-sm text-silver-500">/mo</span>
                        </div>
                        <Link to="/register" className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition-all text-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                          Start Free Trial
                        </Link>
                      </div>
                    </th>

                    {/* Enterprise Plan Header */}
                    <th className="p-8 w-1/4 align-top">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-white mb-2">Enterprise</span>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-3xl font-bold text-white">Custom</span>
                        </div>
                        <Link to="/contact" className="w-full py-2.5 rounded-xl border border-white/20 text-white font-medium text-sm hover:bg-white hover:text-black transition-all text-center">
                          Contact Sales
                        </Link>
                      </div>
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-white/5">
                  {features.map((section) => (
                    <>
                      <tr key={section.category} className="bg-white/5">
                        <td colSpan={4} className="py-4 px-8 text-xs font-bold text-silver-500 uppercase tracking-widest sticky left-0">
                          {section.category}
                        </td>
                      </tr>
                      {section.items.map((item, index) => (
                        <tr key={item.name} className="hover:bg-white/5 transition-colors">
                          <td className="p-6 pl-8 text-sm font-medium text-silver-200 border-r border-white/5">
                            {item.name}
                          </td>
                          <td className="p-6 text-center border-r border-white/5">
                            {renderCell(item.free)}
                          </td>
                          <td className="p-6 text-center bg-white/5 border-r border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                            {renderCell(item.pro)}
                          </td>
                          <td className="p-6 text-center">
                            {renderCell(item.enterprise)}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 text-center">
             <p className="text-sm text-silver-500">
                Prices in USD. Taxes may apply. Need a custom plan? <Link to="/contact" className="text-white hover:underline">Talk to us.</Link>
             </p>
          </div>

        </div>
      </section>

      <FAQSection />
    </PublicLayout>
  );
}
