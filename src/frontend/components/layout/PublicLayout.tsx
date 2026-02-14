import { ReactNode } from 'react';
import { PublicHeader } from '../public/PublicHeader';
import { PublicFooter } from '../public/PublicFooter';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <PublicHeader />
      <main className="flex-1 w-full overflow-x-hidden">{children}</main>
      <PublicFooter />
    </div>
  );
}
