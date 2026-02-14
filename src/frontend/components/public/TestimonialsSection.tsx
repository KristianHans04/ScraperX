import { Quote } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        'Scrapifie has been a game-changer for our data collection needs. The stealth engine bypasses even the toughest anti-bot systems with ease.',
      author: 'Sarah Johnson',
      role: 'CTO',
      company: 'DataFlow Analytics',
      initials: 'SJ'
    },
    {
      quote:
        'We switched from managing our own scraping infrastructure to Scrapifie and cut costs by 60%. The API is intuitive and scales effortlessly.',
      author: 'Michael Chen',
      role: 'Lead Engineer',
      company: 'MarketInsight Pro',
      initials: 'MC'
    },
    {
      quote:
        'The documentation is excellent and support is incredibly responsive. We had our first scraper running in under 10 minutes.',
      author: 'Emily Rodriguez',
      role: 'Data Scientist',
      company: 'ResearchHub',
      initials: 'ER'
    },
  ];

  return (
    <section className="py-24 bg-background border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Loved by Developers
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See what our customers have to say about Scrapifie.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card border border-border/50 p-8 rounded-2xl relative group hover:border-primary/20 transition-colors"
            >
              <Quote className="absolute top-8 right-8 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
              
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {testimonial.initials}
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-foreground">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
              <p className="text-foreground/80 leading-relaxed italic">
                "{testimonial.quote}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
