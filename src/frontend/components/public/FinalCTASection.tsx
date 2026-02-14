import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function FinalCTASection() {
  return (
    <section className="py-32 bg-black relative overflow-hidden border-t border-white/10">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 blur-[120px] rounded-full opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight drop-shadow-xl">
          Ready to Start Scraping?
        </h2>
        <p className="text-xl text-silver-400 mb-10 max-w-2xl mx-auto">
          Join thousands of developers building scalable data pipelines with Scrapifie today.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="group relative w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            <span className="relative z-10 flex items-center">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            to="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center h-14 px-8 rounded-full border border-white/20 bg-white/5 text-silver-200 text-base font-medium hover:bg-white/10 hover:text-white transition-all backdrop-blur-md"
          >
            Contact Sales
          </Link>
        </div>
        
        <p className="mt-8 text-sm text-silver-500">
          No credit card required • 1,000 free credits • Cancel anytime
        </p>
      </div>
    </section>
  );
}
