import { PublicLayout } from '../../components/layout/PublicLayout';
import { Target, Users, Zap, Shield } from 'lucide-react';

export function AboutPage() {
  const values = [
    {
      icon: Target,
      title: 'Developer-First',
      description:
        'We build tools developers love. Clean APIs, comprehensive docs, and powerful features that just work.',
    },
    {
      icon: Users,
      title: 'Customer Success',
      description:
        'Your success is our success. We provide world-class support and continuously improve based on your feedback.',
    },
    {
      icon: Zap,
      title: 'Innovation',
      description:
        'We stay ahead of the curve with cutting-edge anti-bot technology and performance optimizations.',
    },
    {
      icon: Shield,
      title: 'Reliability',
      description:
        'Enterprise-grade infrastructure with 99.9% uptime SLA. Your data extraction never stops.',
    },
  ];

  return (
    <PublicLayout>
      {/* Mission Section */}
      <section className="py-32 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),transparent_70%)] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tighter drop-shadow-2xl">
            About <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-silver-500">Scrapifie</span>
          </h1>
          <p className="text-xl md:text-2xl text-silver-300 leading-relaxed font-light">
            We make web scraping simple, reliable, and scalable for developers and businesses
            worldwide. Our mission is to democratize access to web data with powerful tools that
            handle the complexity so you can focus on building amazing products.
          </p>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-24 bg-black border-y border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            What We Do
          </h2>
          <div className="space-y-8 text-lg text-silver-400 leading-8">
            <p>
              Scrapifie is a cloud-based web scraping API that handles the technical challenges of
              data extraction. Whether you need to scrape static HTML, JavaScript-heavy
              single-page applications, or bypass sophisticated anti-bot systems, we have the right
              engine for the job.
            </p>
            <p>
              Our platform processes over 1 billion requests per month for thousands of developers,
              data scientists, and businesses. From market research and price monitoring to lead
              generation and content aggregation, Scrapifie powers data-driven decisions across
              industries.
            </p>
            <p>
              We believe data should be accessible to everyone. That is why we offer a generous
              free tier, transparent pricing, and comprehensive documentation to help you get
              started in minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors backdrop-blur-sm group"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 mb-6 group-hover:scale-110 transition-transform">
                  <value.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  {value.title}
                </h3>
                <p className="text-silver-400 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 opacity-20 blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
            Join Thousands of Developers
          </h2>
          <p className="text-xl text-silver-400 mb-10">
            Start scraping today with 1,000 free credits. No credit card required.
          </p>
          <a
            href="/register"
            className="inline-block px-10 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-silver-200 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            Get Started Free
          </a>
        </div>
      </section>
    </PublicLayout>
  );
}
