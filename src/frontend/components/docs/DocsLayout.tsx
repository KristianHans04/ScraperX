import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PublicHeader } from '../public/PublicHeader';
import { PublicFooter } from '../public/PublicFooter';
import { ChevronRight, Search, Menu, X } from 'lucide-react';

interface DocsLayoutProps {
  children: ReactNode;
}

const docsNavigation = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Quickstart', href: '/docs' },
      { title: 'Authentication', href: '/docs/authentication' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Engine Selection', href: '/docs/guides/engine-selection' },
      { title: 'Error Handling', href: '/docs/guides/error-handling' },
      { title: 'Proxy Usage', href: '/docs/guides/proxy-usage' },
      { title: 'Pagination', href: '/docs/guides/pagination' },
      { title: 'Rate Limits', href: '/docs/guides/rate-limits' },
      { title: 'Best Practices', href: '/docs/guides/best-practices' },
      { title: 'Webhooks', href: '/docs/guides/webhooks' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Scraping API', href: '/docs/api/scraping' },
      { title: 'API Keys', href: '/docs/api/api-keys' },
      { title: 'Usage & Analytics', href: '/docs/api/usage' },
      { title: 'Webhooks', href: '/docs/api/webhooks' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { title: 'Changelog', href: '/docs/changelog' },
    ],
  },
];

export function DocsLayout({ children }: DocsLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <PublicHeader />
      
      <div className="flex flex-1 pt-16">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-20 left-4 z-40 p-2 rounded-lg bg-white/10 text-white shadow-lg backdrop-blur-md border border-white/10"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-black border-r border-white/10 overflow-y-auto z-30 transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-6">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-silver-400 hover:border-white/30 hover:text-white transition-colors mb-8"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search docs...</span>
              <kbd className="ml-auto px-2 py-0.5 text-xs border border-white/10 rounded bg-white/5">
                ⌘K
              </kbd>
            </button>

            {/* Navigation */}
            <nav className="space-y-8">
              {docsNavigation.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 px-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            location.pathname === item.href
                              ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                              : 'text-silver-400 hover:text-white hover:bg-white/5'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-silver-300 prose-a:text-white prose-a:underline hover:prose-a:decoration-white/50 prose-strong:text-white prose-code:text-white prose-code:bg-white/10 prose-code:rounded prose-code:px-1.5 prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-li:text-silver-300">
            {children}
          </div>
        </main>
      </div>
      
      <PublicFooter />
    </div>
  );
}
