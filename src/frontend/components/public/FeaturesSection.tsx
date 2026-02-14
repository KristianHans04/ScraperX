import { Zap, Globe, Shield, Code, Server, Cpu } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-black relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[20%] right-0 w-[500px] h-[500px] bg-silver-400/5 blur-[100px] rounded-full opacity-20" />
          <div className="absolute bottom-[20%] left-0 w-[500px] h-[500px] bg-white/5 blur-[100px] rounded-full opacity-20" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-6 drop-shadow-lg">
            Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-silver-200 to-silver-500">Scrape at Scale</span>
          </h2>
          <p className="mt-4 text-xl text-silver-400 max-w-2xl mx-auto">
            Powerful infrastructure designed for developers, data scientists, and enterprises requiring high-reliability data extraction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
          {/* Feature 1: Large Span - Anti-Bot */}
          <div className="md:col-span-2 row-span-2 group relative rounded-3xl border border-white/10 bg-black/40 p-8 overflow-hidden hover:border-white/20 transition-all duration-500 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
             <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-6 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Advanced Anti-Bot Evasion</h3>
                <p className="text-silver-400 text-lg mb-8 max-w-md">
                  Our proprietary evasion technology handles fingerprints, TLS handshakes, and headers automatically. Bypass Cloudflare, Akamai, and Datadome with ease.
                </p>
                
                {/* Visual Representation */}
                <div className="mt-auto w-full h-48 bg-black/50 rounded-xl border border-white/10 p-4 relative overflow-hidden shadow-inner">
                   <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
                      <span className="text-xs text-green-400 font-mono">Bypass Successful</span>
                   </div>
                   <div className="space-y-2 font-mono text-xs text-silver-500">
                      <div className="flex justify-between"><span>Fingerprint</span><span className="text-white">Chrome 122 (Win 11)</span></div>
                      <div className="flex justify-between"><span>Canvas</span><span className="text-white">Randomized</span></div>
                      <div className="flex justify-between"><span>WebGL</span><span className="text-white">Hardware Accel.</span></div>
                      <div className="flex justify-between"><span>AudioContext</span><span className="text-white">Noise Injected</span></div>
                   </div>
                   {/* Radar Scan Effect */}
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[200%] w-full animate-[scan_3s_ease-in-out_infinite]" />
                </div>
             </div>
          </div>

          {/* Feature 2: Infrastructure */}
          <div className="md:col-span-1 row-span-1 group relative rounded-3xl border border-white/10 bg-black/40 p-8 overflow-hidden hover:border-white/20 transition-all duration-500 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-6 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Server className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Global Infrastructure</h3>
             <p className="text-silver-400">
                Distributed scaling across 15+ regions. No server management required.
             </p>
          </div>

          {/* Feature 3: Engines */}
          <div className="md:col-span-1 row-span-1 group relative rounded-3xl border border-white/10 bg-black/40 p-8 overflow-hidden hover:border-white/20 transition-all duration-500 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-6 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Cpu className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Multi-Engine Core</h3>
             <p className="text-silver-400">
                Switch between HTTP, Stealth Browser, or Headless modes instantly.
             </p>
          </div>

          {/* Feature 4: Developer First */}
          <div className="md:col-span-3 lg:col-span-1 row-span-1 group relative rounded-3xl border border-white/10 bg-black/40 p-8 overflow-hidden hover:border-white/20 transition-all duration-500 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-6 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Code className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Developer Experience</h3>
             <p className="text-silver-400 mb-4">
                Typed SDKs, Webhooks, and detailed logs.
             </p>
          </div>

           {/* Feature 5: Wide Span - Proxy Network */}
           <div className="md:col-span-2 row-span-1 group relative rounded-3xl border border-white/10 bg-black/40 p-8 overflow-hidden hover:border-white/20 transition-all duration-500 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.05)] flex flex-col sm:flex-row items-center gap-8">
             <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-6 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Residential Proxy Network</h3>
                <p className="text-silver-400">
                  Access 50M+ residential IPs. Rotate per request or hold sessions sticky for up to 30 minutes. Geo-target down to the city level.
                </p>
             </div>
             <div className="w-full sm:w-1/3 aspect-square relative opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                {/* Abstract Globe/Network Dots */}
                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] mask-image-radial-gradient" />
                <div className="grid grid-cols-5 gap-2">
                   {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
