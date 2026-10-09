import type { StudyReadyFormData } from '@/api/client/google-sheets';

export interface LeadSinkResult {
  status: 'saved' | 'skipped' | 'failed';
  sink: 'stibee' | 'google-sheets';
  reason?: string;
}

const STIBEE_DEFAULT_API_BASE_URL = 'https://api.stibee.com/v2';

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function getOptionalFieldName(envName: string): string | null {
  const value = process.env[envName]?.trim();

  return value || null;
}

function buildFields(
  lead: StudyReadyFormData,
): Record<string, string> | undefined {
  const fields: Record<string, string> = {};
  const coursesField = getOptionalFieldName('STIBEE_FIELD_COURSES');
  const concernField = getOptionalFieldName('STIBEE_FIELD_CONCERN');
  const sourceField = getOptionalFieldName('STIBEE_FIELD_SOURCE');
  const submittedAtField = getOptionalFieldName('STIBEE_FIELD_SUBMITTED_AT');

  if (coursesField) {
    fields[coursesField] = lead.courses.join(', ');
  }

  if (concernField && lead.concern) {
    fields[concernField] = lead.concern;
  }

  if (sourceField) {
    fields[sourceField] = 'study-ready-form';
  }

  if (submittedAtField) {
    fields[submittedAtField] = lead.timestamp;
  }

  return Object.keys(fields).length > 0 ? fields : undefined;
}

export function hasStibeeConfig(): boolean {
  return Boolean(process.env.STIBEE_API_KEY && process.env.STIBEE_LIST_ID);
}

export async function addStudyReadyLeadToStibee(
  lead: StudyReadyFormData,
): Promise<LeadSinkResult> {
  const apiKey = process.env.STIBEE_API_KEY;
  const listId = process.env.STIBEE_LIST_ID;

  if (!apiKey || !listId) {
    return {
      status: 'skipped',
      sink: 'stibee',
      reason: 'missing-stibee-config',
    };
  }

  const apiBaseUrl = normalizeBaseUrl(
    process.env.STIBEE_API_BASE_URL || STIBEE_DEFAULT_API_BASE_URL,
  );
  const fields = buildFields(lead);
  try {
    const response = await fetch(
      `${apiBaseUrl}/lists/${encodeURIComponent(listId)}/subscribers`,
      {
        method: 'POST',
        headers: {
          AccessToken: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriber: {
            email: lead.email,
            status: 'subscribed',
            marketingAllowed: lead.marketingConsent,
            ...(fields ? { fields } : {}),
          },
          updateEnabled: true,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');

      return {
        status: 'failed',
        sink: 'stibee',
        reason: `stibee-${response.status}${detail ? `: ${detail}` : ''}`,
      };
    }

    return { status: 'saved', sink: 'stibee' };
  } catch (error) {
    return {
      status: 'failed',
      sink: 'stibee',
      reason: error instanceof Error ? error.message : 'unknown-error',
    };
  }
}
