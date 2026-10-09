const PUBLIC_AUTH_STATE = {
  accessToken: undefined,
  data: undefined,
  isAuthReady: true,
  isAuthenticated: false,
  isHydrated: true,
  memberId: undefined,
  sessionState: 'ANONYMOUS',
} as const;

export const useAuth = () => PUBLIC_AUTH_STATE;
export const useAuthReady = () => PUBLIC_AUTH_STATE;
