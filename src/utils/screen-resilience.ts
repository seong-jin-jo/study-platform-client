export type RelatedPostsUiState =
  | 'hidden'
  | 'loading'
  | 'error'
  | 'empty'
  | 'ready';

export const resolveRelatedPostsUiState = ({
  isVisible,
  isLoading,
  isError,
  itemCount,
}: {
  isVisible: boolean;
  isLoading: boolean;
  isError: boolean;
  itemCount: number;
}): RelatedPostsUiState => {
  if (!isVisible) return 'hidden';
  if (itemCount > 0) return 'ready';
  if (isLoading) return 'loading';
  if (isError) return 'error';
  return 'empty';
};

export type MyRepUiState = 'login' | 'loading' | 'error' | 'empty' | 'ready';

export const resolveMyRepUiState = ({
  isAuthenticated,
  isLoading,
  isError,
  hasData,
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}): MyRepUiState => {
  if (!isAuthenticated) return 'login';
  if (hasData) return 'ready';
  if (isLoading) return 'loading';
  if (isError) return 'error';
  return 'empty';
};

export const ACTIVITY_PROGRESS_TARGETS = {
  readingPoints: 5,
  islands: 7,
} as const;

export const clampActivityProgress = (value: number, target: number) =>
  Math.min(Math.max(value, 0), target);
