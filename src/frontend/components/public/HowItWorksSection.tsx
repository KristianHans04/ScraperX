import { Terminal, Settings, Download } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      icon: Settings,
      number: '01',
      title: 'Configure Your Request',
      description:
        'Select your preferred engine (HTTP, Browser, or Stealth). Set parameters like proxy location, headers, and cookies to match your target.',
    },
    {
      icon: Terminal,
      number: '02',
      title: 'Execute via API',
      description:
        'Send a request to our high-performance API endpoint. We handle the infrastructure, proxy rotation, and captcha solving automatically.',
    },
    {
      icon: Download,
      number: '03',
      title: 'Extract Clean Data',
      description:
        'Receive your data in standardized JSON format. We support auto-parsing for common e-commerce and social media sites.',
    },
  ];

  return (
    <section className="py-24 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Integration in Minutes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to start harvesting web data at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
           {/* Connecting Line */}
           <div className="hidden md:block absolute top-8 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

          {steps.map((step, index) => (
            <div key={step.number} className="relative group">
              {/* Icon / Number */}
              <div className="w-16 h-16 mx-auto bg-card border border-border rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:border-primary/50 group-hover:shadow-primary/20 transition-all duration-300 relative z-10">
                 <step.icon className="w-8 h-8 text-primary" />
                 <div className="absolute -top-3 -right-3 w-8 h-8 bg-foreground rounded-full flex items-center justify-center text-background font-bold text-sm border-4 border-background">
                    {step.number}
                 </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
