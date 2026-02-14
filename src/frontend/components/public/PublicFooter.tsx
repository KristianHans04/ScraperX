import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

export function PublicFooter() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const footerLinks = {
    Product: [
      { name: 'Features', href: '/#features' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'API Documentation', href: '/docs' },
      { name: 'Status', href: '/status' },
    ],
    Company: [
      { name: 'About Us', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Contact', href: '/contact' },
    ],
    Resources: [
      { name: 'Quickstart Guide', href: '/docs/quickstart' },
      { name: 'API Reference', href: '/docs/api' },
      { name: 'Guides', href: '/docs/guides' },
      { name: 'Changelog', href: '/docs/changelog' },
    ],
    Legal: [
      { name: 'Terms of Service', href: '/legal/terms' },
      { name: 'Privacy Policy', href: '/legal/privacy' },
      { name: 'Acceptable Use Policy', href: '/legal/acceptable-use' },
      { name: 'Cookie Policy', href: '/legal/cookies' },
      { name: 'Data Processing Agreement', href: '/legal/dpa' },
    ],
  };

  const socialLinks = [
    { name: 'GitHub', href: 'https://github.com/scrapifie', icon: Github },
    { name: 'Twitter', href: 'https://twitter.com/scrapifie', icon: Twitter },
    { name: 'LinkedIn', href: 'https://linkedin.com/company/scrapifie', icon: Linkedin },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-white/10 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          {/* Brand & Newsletter - Spans 2 cols */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center mb-6">
              <img
                src="/Logo/Name-Dark.svg"
                alt="Scrapifie"
                className="h-18 w-auto"
              />
            </Link>
            <p className="text-silver-400 mb-8 max-w-sm leading-relaxed">
              The premium web scraping API for enterprise data extraction. Built for scale, stealth, and reliability.
            </p>
            
            <div className="relative max-w-sm group">
               <form className="relative">
                  <input
                    type="email"
                    placeholder="Subscribe to updates"
                    className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:bg-white/10 text-sm text-white placeholder:text-silver-500 transition-all shadow-inner"
                  />
                  <button 
                    type="submit"
                    className="absolute right-1.5 top-1.5 p-1.5 bg-white text-black rounded-lg hover:bg-silver-200 transition-colors shadow-lg"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
               </form>
            </div>
          </div>

          {/* Links - Spans 4 cols */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
             {Object.entries(footerLinks).map(([section, links]) => (
                <div key={section}>
                   <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 opacity-80">
                      {section}
                   </h3>
                   <ul className="space-y-3">
                      {links.map((link) => (
                         <li key={link.name}>
                            <Link
                               to={link.href}
                               className="text-sm text-silver-400 hover:text-white transition-colors block hover:translate-x-1 duration-200"
                            >
                               {link.name}
                            </Link>
                         </li>
                      ))}
                   </ul>
                </div>
             ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-silver-500">
            &copy; {currentYear} Scrapifie Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
             {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-silver-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                >
                   <social.icon className="w-5 h-5" />
                </a>
             ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
