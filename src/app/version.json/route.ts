import {
  APP_BUILD_METADATA,
  createAppIdentityHeaders,
} from '@/lib/app-build-metadata';

export function GET() {
  return Response.json(APP_BUILD_METADATA, {
    headers: {
      ...createAppIdentityHeaders(),
      'Cache-Control': 'no-store',
    },
  });
}
