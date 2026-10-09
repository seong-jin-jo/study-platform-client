const router = {
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
  hmrRefresh: () => undefined,
  push: () => undefined,
  replace: () => undefined,
  prefetch: () => Promise.resolve(),
};

export const useRouter = () => router;
export const usePathname = () => window.location.pathname;
export const useSearchParams = () =>
  new URLSearchParams(window.location.search);
export const redirect = () => undefined;
