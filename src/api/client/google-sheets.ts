import { google } from 'googleapis';
import { resolveGooglePrivateKey } from './google-private-key';

// Google Sheets API 설정
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID || '';
const RANGE = 'A:G'; // A부터 G열까지 사용 (시트 이름 없이)

export function hasGoogleSheetsConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      (process.env.GOOGLE_PRIVATE_KEY_B64 || process.env.GOOGLE_PRIVATE_KEY),
  );
}

// Google Sheets API 클라이언트 초기화
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: resolveGooglePrivateKey(),
    },
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });

  return sheets;
}

// 폼 데이터 타입 정의
export interface LandingFormData {
  email: string;
  type: string;
  experience: string;
  features: string[];
  consultation: string;
  agreeTerms: boolean;
  timestamp: string;
}

// Google Sheets에 데이터 추가
export async function addToGoogleSheets(data: LandingFormData): Promise<void> {
  try {
    const sheets = await getSheetsClient();

    // 헤더가 없는 경우 헤더 추가
    const headerRange = 'A1:G1';
    const headerValues = [
      [
        '이메일',
        '직무 유형',
        '경력',
        '관심 기능',
        '상담 내용',
        '개인정보 동의',
        '신청 시간',
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: headerRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: headerValues,
      },
    });

    // 데이터 추가
    const values = [
      [
        data.email,
        data.type,
        data.experience,
        data.features.join(', '),
        data.consultation,
        data.agreeTerms ? '동의' : '비동의',
        data.timestamp,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });
  } catch (error) {
    console.error('Google Sheets API 오류:', error);
    console.error('오류 상세:', error);
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message);
      console.error('오류 스택:', error.stack);
    }
    throw new Error(
      `데이터 저장에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// 시트 탭이 없으면 생성 (스프레드시트 내 다른 폼과 컬럼 구조가 달라 탭을 분리)
async function ensureSheetTabExists(
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  sheetTitle: string,
): Promise<void> {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const exists = spreadsheet.data.sheets?.some(
    (sheet) => sheet.properties?.title === sheetTitle,
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetTitle } } }],
      },
    });
  }
}

// 랜딩 "스터디 레디" 폼 데이터 타입 정의
export interface StudyReadyFormData {
  courses: string[];
  concern: string;
  email: string;
  agree: boolean;
  marketingConsent: boolean;
  timestamp: string;
}

const STUDY_READY_SHEET_TITLE = '스터디레디_신청';
const STUDY_READY_RANGE = `${STUDY_READY_SHEET_TITLE}!A:F`;
const STUDY_READY_HEADER_RANGE = `${STUDY_READY_SHEET_TITLE}!A1:F1`;

// 랜딩 "스터디 레디" 폼 제출을 Google Sheets에 추가
export async function addStudyReadyFormToGoogleSheets(
  data: StudyReadyFormData,
): Promise<void> {
  try {
    const sheets = await getSheetsClient();

    await ensureSheetTabExists(sheets, STUDY_READY_SHEET_TITLE);

    const headerValues = [
      [
        '관심 코스',
        '고민 내용',
        '이메일',
        '개인정보 동의',
        '마케팅 정보 수신 동의',
        '신청 시간',
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: STUDY_READY_HEADER_RANGE,
      valueInputOption: 'RAW',
      requestBody: {
        values: headerValues,
      },
    });

    const values = [
      [
        data.courses.join(', '),
        data.concern,
        data.email,
        data.agree ? '동의' : '비동의',
        data.marketingConsent ? '동의' : '비동의',
        data.timestamp,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: STUDY_READY_RANGE,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });
  } catch (error) {
    console.error('Google Sheets API 오류 (스터디 레디 폼):', error);
    throw new Error(
      `데이터 저장에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// 스프레드시트 존재 여부 확인
export async function checkSpreadsheetExists(): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    return true;
  } catch (error) {
    console.error('스프레드시트 확인 오류:', error);

    return false;
  }
}
