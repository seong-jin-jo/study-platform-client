const AWS_PRESIGNED_DATE_PATTERN =
  /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;

const parseAwsPresignedDateMs = (value: string) => {
  const match = value.match(AWS_PRESIGNED_DATE_PATTERN);
  if (!match) {
    return undefined;
  }

  const [, year, month, day, hour, minute, second] = match;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const parseExpiresSeconds = (value: string | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return undefined;
  }

  return seconds;
};

export const isAwsPresignedUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.searchParams.has('X-Amz-Algorithm') &&
      url.searchParams.has('X-Amz-Date')
    );
  } catch {
    return false;
  }
};

export const isExpiredAwsPresignedUrl = (value: string, nowMs = Date.now()) => {
  try {
    const url = new URL(value);
    if (!isAwsPresignedUrl(value)) {
      return false;
    }

    const signedAtMs = parseAwsPresignedDateMs(
      url.searchParams.get('X-Amz-Date') ?? '',
    );
    const expiresSeconds = parseExpiresSeconds(
      url.searchParams.get('X-Amz-Expires') ?? undefined,
    );
    if (signedAtMs === undefined || expiresSeconds === undefined) {
      return false;
    }

    return signedAtMs + expiresSeconds * 1000 <= nowMs;
  } catch {
    return false;
  }
};

export const getRenderableImageUrl = (
  value: string | null | undefined,
  nowMs = Date.now(),
) => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return undefined;
  }

  return isExpiredAwsPresignedUrl(trimmedValue, nowMs)
    ? undefined
    : trimmedValue;
};
