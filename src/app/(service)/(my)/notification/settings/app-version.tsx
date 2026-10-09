import {
  APP_BUILD_METADATA,
  type AppBuildMetadata,
  formatAppVersionLabel,
} from '@/lib/app-build-metadata';

export default function AppVersion({
  metadata = APP_BUILD_METADATA,
}: {
  metadata?: AppBuildMetadata;
}) {
  return (
    <p data-testid="app-version" className="font-designer-13m text-text-subtle">
      {formatAppVersionLabel(metadata)}
    </p>
  );
}
