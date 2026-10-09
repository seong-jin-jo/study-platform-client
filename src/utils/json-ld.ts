/**
 * Serialize structured data for an inline script element without allowing the
 * payload to terminate the script or introduce JavaScript line separators.
 */
export const serializeJsonLd = (data: unknown): string => {
  const serialized = JSON.stringify(data);
  if (serialized === undefined) {
    throw new TypeError('JSON-LD data must be JSON serializable');
  }

  return serialized
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
};
