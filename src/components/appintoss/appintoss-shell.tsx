import type { ReactNode } from 'react';
import MobileTabBar from '@/components/common/layout/mobile-tab-bar';
import PublicBrandMark from '@/components/common/layout/public-brand-mark';
import AppintossNavigation from './appintoss-navigation';

export default function AppintossShell({ children }: { children: ReactNode }) {
  return (
    <AppintossNavigation>
      <header className="app-shell-header sticky top-0 z-50 h-700 w-full border-b border-border-subtle bg-background-default">
        <div className="app-shell-safe-x mx-auto flex h-full w-full max-w-page items-center px-200 md:px-300 lg:px-600">
          <PublicBrandMark />
        </div>
      </header>
      <main className="pb-800 lg:pb-0">{children}</main>
      <MobileTabBar className="md:flex lg:hidden" />
    </AppintossNavigation>
  );
}
