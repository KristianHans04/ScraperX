export function SocialProofSection() {
  const stats = [
    { value: '1B+', label: 'Requests Processed' },
    { value: '50K+', label: 'Active Users' },
    { value: '99.9%', label: 'Uptime SLA' },
  ];

  const trustedCompanies = [
    'Acme Corp',
    'DataSystems',
    'CloudScale',
    'TechFlow',
    'InnovateAI',
    'ScrapeMaster',
  ];

  return (
    <section className="py-12 border-y border-border/40 bg-background/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Trusted By - Moved top for better flow */}
        <div className="mb-16 text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-8">
            Trusted by engineering teams at
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {trustedCompanies.map((company, index) => (
              <div
                key={index}
                className="text-xl md:text-2xl font-bold text-foreground/40 hover:text-foreground transition-colors cursor-default"
              >
                {company}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-border/40 pt-16">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center group">
              <div className="text-5xl md:text-6xl font-extralight tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                {stat.value}
              </div>
              <div className="mt-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
