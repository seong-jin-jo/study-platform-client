// 레거시 회원가입 모달은 제거됐다. 신규 가입은 소셜 로그인(OAuth) 후
// /class 의 OnboardingModal(신규 온보딩)로 진행한다.
// 옛 /sign-up 링크·북마크·미가입 세션 리다이렉트가 들어와도 신규 온보딩으로 보낸다.
import { redirect } from 'next/navigation';
import { AUTH_ROUTE_PATHS } from '@/features/auth/model/auth-route';

export default function SignupPage() {
  redirect(AUTH_ROUTE_PATHS.CLASS_ONBOARDING);
}
