import 'server-only';

import { resolveStrapiDraftMode } from './strapi-draft-mode';

const requireServerValue = (name: 'STRAPI_URL' | 'STRAPI_API_TOKEN') => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for the server-only Strapi client.`);
  }

  return value;
};

export const getStrapiBaseUrl = () =>
  requireServerValue('STRAPI_URL').replace(/\/$/, '');

export const getStrapiApiToken = () => requireServerValue('STRAPI_API_TOKEN');

export const isStrapiDraftMode = () => resolveStrapiDraftMode(process.env);
