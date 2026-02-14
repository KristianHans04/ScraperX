import { Link } from 'react-router-dom';
import { ArrowRight, Terminal, Zap, Shield, Globe } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden perspective-1000 bg-gradient-to-b from-gray-100 via-white to-white dark:from-[#0a1628] dark:via-[#060e1a] dark:to-black">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)] blur-[80px]" />
        <div className="absolute top-[20%] left-0 w-[400px] h-[400px] bg-silver-400/5 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-silver-500/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        {/* Silver Badge */}
        <div className="inline-flex items-center rounded-full border border-silver-500/30 bg-silver-500/10 px-4 py-1.5 text-sm font-medium text-silver-200 backdrop-blur-md mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
          <span className="flex h-2 w-2 rounded-full bg-white mr-2 animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          <span className="bg-gradient-to-r from-white to-silver-400 bg-clip-text text-transparent">v2.0: Intelligent Anti-Bot Evasion</span>
        </div>

        {/* 3D Headline */}
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white max-w-5xl mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 drop-shadow-2xl">
          Scrape the Web <br />
          <span className="relative inline-block">
            <span className="absolute -inset-1 blur-2xl bg-silver-400/20 rounded-full" />
            <span className="relative bg-gradient-to-b from-white via-silver-200 to-silver-500 bg-clip-text text-transparent">
              Without Limits
            </span>
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-silver-400 max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 leading-relaxed">
          Enterprise-grade web scraping API with built-in stealth browsers, rotating proxies, and captcha solving.
        </p>

        {/* Metallic CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-24 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <Link
            to="/register"
            className="group relative w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            <span className="relative z-10 flex items-center">
              Start Scraping Free
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            to="/docs"
            className="group w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-full border border-silver-500/30 bg-black/50 backdrop-blur-xl px-8 text-base font-medium text-silver-200 transition-all hover:bg-silver-500/10 hover:border-silver-400/50 hover:text-white focus:outline-none"
          >
            View Documentation
          </Link>
        </div>

        {/* 3D Floating Interface */}
        <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 perspective-1000">
          <div className="relative transform-style-3d rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out">
            
            {/* Main Window */}
            <div className="relative rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,1)] overflow-hidden">
              {/* Glossy Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
              
              {/* Window Controls */}
              <div className="flex items-center px-6 py-4 border-b border-white/5 bg-white/5">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-[0_0_10px_rgba(255,95,86,0.5)]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-[0_0_10px_rgba(255,189,46,0.5)]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-[0_0_10px_rgba(39,201,63,0.5)]" />
                </div>
                <div className="mx-auto flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/5">
                  <Shield className="w-3 h-3 text-silver-400" />
                  <span className="text-xs font-mono text-silver-400">api.scrapifie.io</span>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
                {/* Code Side */}
                <div className="p-8 bg-black/50 border-r border-white/5 text-left font-mono text-sm relative">
                   <div className="absolute top-0 right-0 p-4 opacity-20">
                      <Terminal className="w-24 h-24 text-white" />
                   </div>
                   <div className="relative z-10 space-y-2">
                      <div className="flex items-center gap-2 text-silver-500 mb-4">
                        <span className="text-xs uppercase tracking-wider">Request Configuration</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-purple-400">curl</span> <span className="text-silver-300">-X POST</span> <span className="text-green-400">https://api.scrapifie.io/v1/scrape</span> <span className="text-silver-500">\</span>
                      </div>
                      <div className="pl-4 space-y-1 text-silver-300">
                        <div><span className="text-silver-500">-H</span> <span className="text-green-400">"Authorization: Bearer sk_live_..."</span> <span className="text-silver-500">\</span></div>
                        <div><span className="text-silver-500">-d</span> <span className="text-yellow-300">'{"{"}</span></div>
                        <div className="pl-4"><span className="text-blue-300">"url"</span>: <span className="text-green-400">"https://example.com"</span>,</div>
                        <div className="pl-4"><span className="text-blue-300">"render_js"</span>: <span className="text-purple-400">true</span>,</div>
                        <div className="pl-4"><span className="text-blue-300">"premium_proxy"</span>: <span className="text-purple-400">true</span>,</div>
                        <div className="pl-4"><span className="text-blue-300">"stealth"</span>: <span className="text-purple-400">true</span></div>
                        <div><span className="text-yellow-300">{"}"}'</span></div>
                      </div>
                   </div>
                </div>

                {/* Visual Side */}
                <div className="p-8 bg-gradient-to-br from-white/5 to-transparent text-left relative overflow-hidden flex flex-col justify-center">
                   {/* Grid Background */}
                   <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                   
                   <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                         <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                               <Zap className="w-5 h-5" />
                            </div>
                            <div>
                               <div className="text-sm font-medium text-white">Status: 200 OK</div>
                               <div className="text-xs text-silver-500">Time: 1.2s</div>
                            </div>
                         </div>
                         <div className="px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white border border-white/10">
                            Live
                         </div>
                      </div>

                      <div className="space-y-3">
                         <div className="p-3 rounded-lg bg-black/40 border border-white/5 backdrop-blur-md">
                            <div className="text-xs text-silver-500 mb-1">Title Extracted</div>
                            <div className="text-sm text-white truncate">Example Domain</div>
                         </div>
                         <div className="p-3 rounded-lg bg-black/40 border border-white/5 backdrop-blur-md">
                            <div className="text-xs text-silver-500 mb-1">Content Length</div>
                            <div className="text-sm text-white">1,256 bytes</div>
                         </div>
                         <div className="flex gap-2">
                            <div className="flex-1 p-3 rounded-lg bg-black/40 border border-white/5 backdrop-blur-md">
                               <div className="text-xs text-silver-500 mb-1">Proxy</div>
                               <div className="text-sm text-green-400 flex items-center gap-1">
                                  <Globe className="w-3 h-3" /> US-Res
                               </div>
                            </div>
                            <div className="flex-1 p-3 rounded-lg bg-black/40 border border-white/5 backdrop-blur-md">
                               <div className="text-xs text-silver-500 mb-1">Bot Score</div>
                               <div className="text-sm text-green-400 flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> 0.05
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Reflection */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-gradient-to-b from-white/10 to-transparent blur-2xl transform scale-y-[-1] opacity-50" />
        </div>
      </div>
    </section>
  );
}
