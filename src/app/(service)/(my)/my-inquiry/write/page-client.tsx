'use client';

import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useReducer, useRef, useState } from 'react';
import Button from '@/components/common/ui/button';
import { normalizeImageFileForUpload } from '@/components/common/ui/editor/image-utils';
import IconButton from '@/components/common/ui/icon-button';
import { Modal } from '@/components/common/ui/modal';
import { uploadCommunityMarkdownImage } from '@/features/community/model/community-markdown-image-upload';
import {
  type InquiryCategory,
  useCreateMyOneToOneInquiry,
  useSaveDraftOneToOneInquiry,
} from '@/hooks/queries/my-inquiry/inquiry-queries';
import { useToastStore } from '@/stores/use-toast-store';
import { toCommunityContentImagePath } from '@/types/community/markdown';
import {
  INQUIRY_CATEGORIES,
  INQUIRY_CATEGORY_LABELS,
} from '@/types/schemas/inquiry.schema';

const MAX_ATTACHMENT_COUNT = 10;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

interface AttachedImage {
  previewUrl: string;
  key: string;
}

interface InquiryForm {
  category: InquiryCategory | '';
  title: string;
  content: string;
  images: AttachedImage[];
  notifyEmail: boolean;
  notifyKakao: boolean;
}

type InquiryFormAction =
  | { type: 'setCategory'; value: InquiryCategory | '' }
  | { type: 'setTitle'; value: string }
  | { type: 'setContent'; value: string }
  | { type: 'addImages'; value: AttachedImage[] }
  | { type: 'removeImage'; index: number }
  | { type: 'setNotifyEmail'; value: boolean }
  | { type: 'setNotifyKakao'; value: boolean };

const INITIAL_INQUIRY_FORM: InquiryForm = {
  category: '',
  title: '',
  content: '',
  images: [],
  notifyEmail: false,
  notifyKakao: false,
};

function inquiryFormReducer(
  state: InquiryForm,
  action: InquiryFormAction,
): InquiryForm {
  switch (action.type) {
    case 'setCategory':
      return { ...state, category: action.value };
    case 'setTitle':
      return { ...state, title: action.value };
    case 'setContent':
      return { ...state, content: action.value };
    case 'addImages':
      return {
        ...state,
        images: [...state.images, ...action.value].slice(
          0,
          MAX_ATTACHMENT_COUNT,
        ),
      };
    case 'removeImage':
      return {
        ...state,
        images: state.images.filter((_, i) => i !== action.index),
      };
    case 'setNotifyEmail':
      return { ...state, notifyEmail: action.value };
    case 'setNotifyKakao':
      return { ...state, notifyKakao: action.value };
  }
}

export default function MyInquiryWritePage() {
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);
  const [form, dispatch] = useReducer(inquiryFormReducer, INITIAL_INQUIRY_FORM);
  const { category, title, content, images, notifyEmail, notifyKakao } = form;
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: createInquiry, isPending: isSubmitting } =
    useCreateMyOneToOneInquiry();
  const { mutateAsync: saveDraft, isPending: isSavingDraft } =
    useSaveDraftOneToOneInquiry();

  const handleSelectImages = async (files: File[]) => {
    const remaining = MAX_ATTACHMENT_COUNT - images.length;
    if (remaining <= 0) {
      showToast(
        `이미지는 최대 ${MAX_ATTACHMENT_COUNT}장까지 첨부할 수 있어요.`,
        'error',
      );
      return;
    }
    const accepted = files.slice(0, remaining);
    if (files.length > accepted.length) {
      showToast(
        `이미지는 최대 ${MAX_ATTACHMENT_COUNT}장까지 첨부할 수 있어요.`,
        'error',
      );
    }
    setIsUploading(true);
    try {
      const uploaded: AttachedImage[] = [];
      for (const file of accepted) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          showToast(
            `이미지 파일 크기는 10MB 이하만 첨부할 수 있어요. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
            'error',
          );
          continue;
        }
        const normalized = await normalizeImageFileForUpload(file);
        const url = await uploadCommunityMarkdownImage(normalized);
        const key = toCommunityContentImagePath(url);
        if (!key) {
          showToast('이미지 업로드에 실패했습니다.', 'error');
          continue;
        }
        uploaded.push({ previewUrl: url, key });
      }
      if (uploaded.length > 0) {
        dispatch({ type: 'addImages', value: uploaded });
      }
    } catch {
      showToast('이미지 업로드에 실패했습니다.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBack = () => {
    const hasDraft =
      Boolean(category) ||
      Boolean(title.trim()) ||
      Boolean(content.trim()) ||
      images.length > 0 ||
      notifyEmail ||
      notifyKakao;
    if (hasDraft) {
      setCancelDialogOpen(true);
    } else {
      router.push('/my-inquiry');
    }
  };

  const handleDraft = async () => {
    if (!category && !title.trim() && !content.trim() && images.length === 0) {
      showToast('내용을 입력 후 임시저장할 수 있습니다.', 'error');
      return;
    }
    try {
      await saveDraft({
        id: 0,
        request: {
          inquiryCategory: category || undefined,
          inquiryTitle: title.trim() || undefined,
          inquiryContent: content.trim() || undefined,
          inquiryAttachmentKeys: images.map((image) => image.key),
        },
      });
      showToast('임시저장되었습니다.', 'success');
    } catch {
      showToast('임시저장에 실패했습니다.', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!category) {
      showToast('문의 유형을 선택해 주세요.', 'error');
      return;
    }
    if (!title.trim()) {
      showToast('제목을 입력해 주세요.', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('내용을 입력해 주세요.', 'error');
      return;
    }

    try {
      await createInquiry({
        inquiryCategory: category,
        inquiryTitle: title.trim(),
        inquiryContent: content.trim(),
        inquiryAttachmentKeys: images.map((image) => image.key),
        replyEmailOptIn: notifyEmail,
        replyAlerttalkOptIn: notifyKakao,
      });
      showToast('문의가 등록되었습니다.', 'success');
      router.push('/my-inquiry');
    } catch {
      showToast('문의 등록에 실패했습니다.', 'error');
    }
  };

  const canAddMore = images.length < MAX_ATTACHMENT_COUNT;

  return (
    <div className="flex flex-col gap-500">
      {/* 헤더 */}
      <div className="flex items-center gap-200">
        <IconButton
          type="button"
          onClick={handleBack}
          label="문의 목록으로 돌아가기"
          className="h-auto w-auto rounded-none text-text-subtle hover:bg-transparent hover:text-text-default"
        >
          <ArrowLeft size={20} />
        </IconButton>
        <h1 className="font-designer-24b text-text-default">문의 작성</h1>
      </div>

      {/* 폼 */}
      <div className="flex flex-col gap-400">
        {/* 유형 선택 */}
        <div className="flex flex-col gap-100">
          <label
            htmlFor="inquiry-category"
            className="font-designer-14m text-text-default"
          >
            유형 선택 <span className="text-red-500">*</span>
          </label>
          <select
            id="inquiry-category"
            value={category}
            onChange={(e) =>
              dispatch({
                type: 'setCategory',
                value: e.target.value as InquiryCategory | '',
              })
            }
            className="border-border-default rounded-100 font-designer-14r text-text-default border px-200 py-150 outline-none"
          >
            <option value="">유형을 선택해 주세요</option>
            {INQUIRY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {INQUIRY_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div className="flex flex-col gap-100">
          <label
            htmlFor="inquiry-title"
            className="font-designer-14m text-text-default"
          >
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            id="inquiry-title"
            type="text"
            value={title}
            onChange={(e) =>
              dispatch({ type: 'setTitle', value: e.target.value })
            }
            maxLength={200}
            placeholder="제목을 입력해주세요."
            className="border-border-default rounded-100 font-designer-14r text-text-default placeholder:text-text-subtlest border px-200 py-150 outline-none"
          />
        </div>

        {/* 내용 */}
        <div className="flex flex-col gap-100">
          <label
            htmlFor="inquiry-content"
            className="font-designer-14m text-text-default"
          >
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="inquiry-content"
            value={content}
            onChange={(e) =>
              dispatch({ type: 'setContent', value: e.target.value })
            }
            rows={8}
            maxLength={2000}
            placeholder="문의 내용을 자세히 작성해 주세요."
            className="border-border-default rounded-100 font-designer-14r text-text-default placeholder:text-text-subtlest resize-none border px-200 py-150 outline-none"
          />
          <p className="font-designer-12r text-text-subtlest text-right">
            {content.length}/2000
          </p>
        </div>

        {/* 이미지 첨부 */}
        <div className="flex flex-col gap-150">
          <p className="font-designer-14m text-text-default">이미지 첨부하기</p>
          <div className="flex flex-wrap gap-200">
            {images.map((image, index) => (
              <div
                key={image.key}
                className="relative size-1500 overflow-hidden rounded-150"
              >
                <Image
                  src={image.previewUrl}
                  alt={`첨부 이미지 ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <button
                  type="button"
                  aria-label="이미지 삭제"
                  onClick={() => dispatch({ type: 'removeImage', index })}
                  className="absolute right-50 top-50 flex size-250 items-center justify-center rounded-full bg-gray-800 text-background-default"
                >
                  <X className="size-150" />
                </button>
              </div>
            ))}
            {canAddMore && (
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="border-border-default flex size-1500 flex-col items-center justify-center gap-100 rounded-150 border-2 border-dashed bg-gray-50 text-gray-400 hover:border-border-brand hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus className="size-400" />
                <span className="font-designer-12m">
                  {isUploading
                    ? '업로드 중'
                    : `${images.length}/${MAX_ATTACHMENT_COUNT}`}
                </span>
              </button>
            )}
          </div>
          <p className="font-designer-12r text-text-subtlest">
            * 최대 {MAX_ATTACHMENT_COUNT}장의 사진을 등록할 수 있어요. 10MB
            이하의 파일만 등록할 수 있어요.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            aria-label="이미지 첨부"
            className="hidden"
            onChange={async (event) => {
              const input = event.currentTarget;
              const files = input.files ? Array.from(input.files) : [];
              if (files.length > 0) await handleSelectImages(files);
              input.value = '';
            }}
          />
        </div>

        {/* 알림 설정 */}
        <div className="flex flex-col gap-200">
          <p className="font-designer-14m text-text-default">알림 설정</p>
          <div className="flex flex-col gap-150">
            <label className="flex cursor-pointer items-center gap-200">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) =>
                  dispatch({ type: 'setNotifyEmail', value: e.target.checked })
                }
                className="size-400 rounded-50 accent-rose-500"
              />
              <span className="font-designer-14r text-text-default">
                이메일 알림
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-200">
              <input
                type="checkbox"
                checked={notifyKakao}
                onChange={(e) =>
                  dispatch({ type: 'setNotifyKakao', value: e.target.checked })
                }
                className="size-400 rounded-50 accent-rose-500"
              />
              <span className="font-designer-14r text-text-default">
                카카오톡 알림
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-200">
        <Button
          color="secondary"
          size="medium"
          className="flex-1"
          disabled={isSavingDraft}
          onClick={handleDraft}
        >
          {isSavingDraft ? '저장 중...' : '임시저장'}
        </Button>
        <Button
          color="primary"
          size="medium"
          className="flex-1"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? '등록 중...' : '등록하기'}
        </Button>
      </div>

      {/* 작성 취소 확인 다이얼로그 */}
      <Modal.Root open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <Modal.Portal>
          <Modal.Overlay />
          <Modal.Content size="medium">
            <Modal.Header variant="alert">
              <Modal.Title>작성을 취소하시겠어요?</Modal.Title>
            </Modal.Header>
            <Modal.Body variant="alert">
              <p className="font-designer-14r text-text-subtle text-center">
                작성 중인 내용이 저장되지 않습니다.
              </p>
            </Modal.Body>
            <Modal.Footer variant="alert">
              <div className="flex gap-200">
                <Button
                  color="secondary"
                  size="medium"
                  className="flex-1"
                  onClick={() => setCancelDialogOpen(false)}
                >
                  계속 작성
                </Button>
                <Button
                  color="primary"
                  size="medium"
                  className="flex-1"
                  onClick={() => router.push('/my-inquiry')}
                >
                  확인
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Portal>
      </Modal.Root>
    </div>
  );
}
