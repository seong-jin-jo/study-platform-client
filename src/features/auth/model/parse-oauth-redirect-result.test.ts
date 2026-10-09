import { describe, expect, it } from 'vitest';
import { OAUTH_REDIRECT_RESULT_KINDS } from '@/types/auth/domain';
import { parseOAuthRedirectResult } from './parse-oauth-redirect-result';

const parse = (query: string) =>
  parseOAuthRedirectResult(new URLSearchParams(query));

describe('parseOAuthRedirectResult', () => {
  it('marks new OAuth members as phone-verification-required when backend sends the flag', () => {
    const result = parse(
      'type=oauth2&is-success=true&is-guest=true&access-token=token&auth-vendor=GOOGLE&phone-verification-required=true',
    );

    expect(result).toMatchObject({
      kind: OAUTH_REDIRECT_RESULT_KINDS.NEW_MEMBER_SUCCESS,
      accessToken: 'token',
      authVendor: 'GOOGLE',
      phoneVerificationRequired: true,
    });
  });

  it('keeps new OAuth members compatible when the phone verification flag is omitted', () => {
    const result = parse(
      'type=oauth2&is-success=true&is-guest=true&access-token=token&auth-vendor=KAKAO',
    );

    expect(result).toMatchObject({
      kind: OAUTH_REDIRECT_RESULT_KINDS.NEW_MEMBER_SUCCESS,
      accessToken: 'token',
      authVendor: 'KAKAO',
      phoneVerificationRequired: false,
    });
  });
});
