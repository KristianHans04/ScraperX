import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';

export function PricingSummarySection() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out Scrapifie',
      features: [
        '1,000 free credits',
        'HTTP engine only',
        'Basic rate limits',
        'Community support',
        '7-day data retention',
      ],
      cta: 'Get Started',
      ctaLink: '/register',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$49',
      period: 'per month',
      description: 'For growing teams and businesses',
      features: [
        '10,000 credits included',
        'All three engines',
        'Higher rate limits',
        'Priority support',
        '90-day data retention',
        'Webhook notifications',
      ],
      cta: 'Start Free Trial',
      ctaLink: '/register',
      featured: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact sales',
      description: 'For large-scale scraping operations',
      features: [
        'Custom credit packages',
        'Dedicated infrastructure',
        'SLA guarantees',
        '24/7 premium support',
        'Unlimited data retention',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      ctaLink: '/contact',
      featured: false,
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, upgrade as you scale. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 flex flex-col ${
                plan.featured
                  ? 'bg-card border border-primary/50 shadow-2xl shadow-primary/10 ring-1 ring-primary/20'
                  : 'bg-card/50 border border-border hover:border-border/80 transition-colors'
              }`}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {plan.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-0.5 text-primary">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm text-foreground/80">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.ctaLink}
                className={`w-full py-3 px-4 rounded-xl text-center text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  plan.featured
                    ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {plan.cta}
                {plan.featured && <ArrowRight className="w-4 h-4" />}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
