import HomeHeaderClient from '@/components/common/layout/home-header-client';
import PublicBrandMark from '@/components/common/layout/public-brand-mark';
import { AUTH_SESSION_STATES } from '@/types/auth/domain';

export default function PublicHomeHeader() {
  return (
    <header className="app-shell-header sticky top-0 z-10 w-full border-b border-border-subtle bg-background-default max-md:h-700 md:relative md:h-800 md:border-b-0 md:py-0 md:mix-blend-multiply xl:h-auto xl:py-125">
      <div className="app-shell-safe-x mx-auto flex h-full w-full max-w-page items-center justify-between md:px-200 lg:px-300 xl:px-600">
        <PublicBrandMark />

        <HomeHeaderClient initialSessionState={AUTH_SESSION_STATES.ANONYMOUS} />
      </div>
    </header>
  );
}
