import { type NextRequest, NextResponse } from 'next/server';
import {
  addStudyReadyFormToGoogleSheets,
  hasGoogleSheetsConfig,
  type StudyReadyFormData,
} from '@/api/client/google-sheets';
import {
  addStudyReadyLeadToStibee,
  type LeadSinkResult,
} from '@/api/client/stibee';

async function addStudyReadyLeadToSheets(
  formData: StudyReadyFormData,
): Promise<LeadSinkResult> {
  if (!hasGoogleSheetsConfig()) {
    return {
      status: 'skipped',
      sink: 'google-sheets',
      reason: 'missing-google-sheets-config',
    };
  }

  try {
    await addStudyReadyFormToGoogleSheets(formData);

    return { status: 'saved', sink: 'google-sheets' };
  } catch (error) {
    console.error('Google Sheets 저장 실패 (스터디 레디 폼):', error);

    return {
      status: 'failed',
      sink: 'google-sheets',
      reason: error instanceof Error ? error.message : 'unknown-error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courses, concern, agree } = body;
    const marketingConsent = body.marketingConsent === true;
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const normalizedCourses = Array.isArray(courses)
      ? courses
          .filter((course): course is string => typeof course === 'string')
          .map((course) => course.trim())
          .filter(Boolean)
      : [];
    const normalizedConcern = typeof concern === 'string' ? concern.trim() : '';

    if (!email || normalizedCourses.length === 0 || agree !== true) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 },
      );
    }

    const formData: StudyReadyFormData = {
      courses: normalizedCourses,
      concern: normalizedConcern,
      email,
      agree,
      marketingConsent,
      timestamp: new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    const [stibeeResult, sheetsResult] = await Promise.all([
      addStudyReadyLeadToStibee(formData),
      addStudyReadyLeadToSheets(formData),
    ]);
    const sinkResults = [stibeeResult, sheetsResult];

    if (marketingConsent && stibeeResult.status !== 'saved') {
      console.error('마케팅 동의 리드 Stibee 저장 실패:', stibeeResult);

      return NextResponse.json(
        {
          error: '제출 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 503 },
      );
    }

    const saved = sinkResults.some((result) => result.status === 'saved');

    if (!saved) {
      console.error('스터디 레디 폼 저장소 저장 실패:', sinkResults);

      return NextResponse.json(
        {
          error: '제출 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { message: '신청이 성공적으로 제출되었습니다.' },
      { status: 200 },
    );
  } catch (error) {
    console.error('스터디 레디 폼 제출 오류:', error);

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    );
  }
}
