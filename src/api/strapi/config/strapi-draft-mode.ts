const ENABLED_VALUE = 'true';
const DISABLED_VALUE = 'false';
const DEVELOPMENT_TARGET = 'development';

export const STRAPI_DRAFT_MODE_ENV = 'STRAPI_DRAFT_MODE';
export const ZEROONE_DEPLOY_TARGET_ENV = 'ZEROONE_DEPLOY_TARGET';

export function resolveStrapiDraftMode(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  const requested = env.STRAPI_DRAFT_MODE?.trim().toLowerCase();

  if (!requested || requested === DISABLED_VALUE) {
    return false;
  }

  if (requested !== ENABLED_VALUE) {
    throw new Error(
      `${STRAPI_DRAFT_MODE_ENV} must be either "true" or "false".`,
    );
  }

  const deployTarget = env.ZEROONE_DEPLOY_TARGET?.trim().toLowerCase();
  if (deployTarget !== DEVELOPMENT_TARGET) {
    throw new Error(
      `${STRAPI_DRAFT_MODE_ENV}=true is allowed only when ${ZEROONE_DEPLOY_TARGET_ENV}=development.`,
    );
  }

  return true;
}
