import { ReactNode, useState, useEffect } from 'react';
import { PublicLayout } from '../layout/PublicLayout';

interface LegalLayoutProps {
  title: string;
  version: string;
  effectiveDate: string;
  children: ReactNode;
  sections: { id: string; title: string }[];
}

export function LegalLayout({ title, version, effectiveDate, children, sections }: LegalLayoutProps) {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(section => document.getElementById(section.id));
      const scrollPosition = window.scrollY + 100;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <PublicLayout>
      <div className="py-20 bg-black min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Sidebar TOC */}
            <aside className="lg:col-span-3">
              <div className="sticky top-24">
                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-6 tracking-wide">
                    Table of Contents
                  </h3>
                  <nav className="space-y-1 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/10" />
                    
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`block w-full text-left text-sm py-2 px-4 border-l-2 transition-all duration-200 ${
                          activeSection === section.id
                            ? 'border-white text-white font-medium bg-white/5'
                            : 'border-transparent text-silver-400 hover:text-white hover:border-white/30'
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-9">
              <div className="bg-black border border-white/10 rounded-2xl p-10 shadow-2xl relative overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 blur-[100px] rounded-full pointer-events-none" />

                <header className="mb-10 pb-8 border-b border-white/10 relative z-10">
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                    {title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-6 text-sm font-mono text-silver-400">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">v{version}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Effective: {effectiveDate}</span>
                  </div>
                </header>

                <div className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-silver-300 prose-a:text-white prose-a:underline decoration-white/30 hover:decoration-white prose-strong:text-white prose-ul:text-silver-300 prose-li:marker:text-silver-500">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
