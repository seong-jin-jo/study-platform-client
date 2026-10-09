export const APP_BUILD_VALUE_UNAVAILABLE = 'unavailable';

export interface AppBuildMetadata {
  release: string;
  commit: string;
  build_id: string;
  built_at: string;
  channel: string;
}

type AppBuildMetadataInput = Partial<AppBuildMetadata>;

const normalizeValue = (value?: string) =>
  value?.trim() || APP_BUILD_VALUE_UNAVAILABLE;

const normalizeRelease = (value?: string) => {
  const release = normalizeValue(value);
  if (release === APP_BUILD_VALUE_UNAVAILABLE || release.startsWith('v')) {
    return release;
  }
  return `v${release}`;
};

export function resolveAppBuildMetadata(
  input: AppBuildMetadataInput,
): AppBuildMetadata {
  return {
    release: normalizeRelease(input.release),
    commit: normalizeValue(input.commit),
    build_id: normalizeValue(input.build_id),
    built_at: normalizeValue(input.built_at),
    channel: normalizeValue(input.channel),
  };
}

export const APP_BUILD_METADATA = resolveAppBuildMetadata({
  release: process.env.NEXT_PUBLIC_APP_RELEASE,
  commit: process.env.NEXT_PUBLIC_APP_COMMIT,
  build_id: process.env.NEXT_PUBLIC_APP_BUILD_ID,
  built_at: process.env.NEXT_PUBLIC_APP_BUILT_AT,
  channel: process.env.NEXT_PUBLIC_APP_CHANNEL,
});

export function createAppIdentityHeaders(
  metadata: AppBuildMetadata = APP_BUILD_METADATA,
) {
  return {
    'X-App-Version': metadata.release,
    'X-App-Commit': metadata.commit,
  } as const;
}

export function formatAppVersionLabel(metadata: AppBuildMetadata) {
  const releaseLabel =
    metadata.release === APP_BUILD_VALUE_UNAVAILABLE
      ? '앱 버전 확인 불가'
      : `앱 버전 ${metadata.release}`;
  const commitLabel =
    metadata.commit === APP_BUILD_VALUE_UNAVAILABLE
      ? '커밋 확인 불가'
      : metadata.commit.slice(0, 7);

  return `${releaseLabel} (${commitLabel})`;
}
