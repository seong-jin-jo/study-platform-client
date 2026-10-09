'use client';

import { ImagePlus, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import Button from '@/components/common/ui/button';
import { normalizeImageFileForUpload } from '@/components/common/ui/editor/image-utils';
import { uploadCommunityMarkdownImage } from '@/features/community/model/community-markdown-image-upload';
import { useToastStore } from '@/stores/use-toast-store';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (imageUrls: string[], previewUrls: string[]) => void;
  maxImages: number;
}

interface ImageEntry {
  imageUrl: string;
  previewUrl: string;
}

export function LessonScreenshotModal({
  open,
  onClose,
  onConfirm,
  maxImages,
}: Props) {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showToast = useToastStore((s) => s.showToast);

  if (!open) return null;

  async function handleFilesSelect(files: File[]) {
    if (files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      showToast(`이미지는 최대 ${maxImages}장까지 첨부할 수 있어요.`, 'error');
      return;
    }
    const selected = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      showToast(
        `이미지는 최대 ${maxImages}장까지 첨부할 수 있어 일부만 추가했어요.`,
        'error',
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    setUploading(true);
    try {
      for (const file of selected) {
        if (file.size > MAX_SIZE) {
          showToast(
            `이미지 파일 크기는 5MB 이하만 첨부할 수 있어요. (${file.name}: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
            'error',
          );
          continue;
        }
        try {
          const normalizedFile = await normalizeImageFileForUpload(file);
          const url = await uploadCommunityMarkdownImage(normalizedFile);
          const preview = URL.createObjectURL(normalizedFile);
          setImages((prev) => [
            ...prev,
            { imageUrl: url, previewUrl: preview },
          ]);
        } catch {
          showToast(`이미지 업로드에 실패했습니다. (${file.name})`, 'error');
        }
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleConfirm() {
    if (images.length === 0) return;
    onConfirm(
      images.map((e) => e.imageUrl),
      images.map((e) => e.previewUrl),
    );
    setImages([]);
    onClose();
  }

  function handleClose() {
    images.forEach((e) => {
      URL.revokeObjectURL(e.previewUrl);
    });
    setImages([]);
    onClose();
  }

  const canAddMore = images.length < maxImages;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <Button
        type="button"
        aria-label="닫기"
        className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents absolute inset-0 bg-gray-1000/40"
        onClick={handleClose}
      />
      <div className="relative z-10 mx-400 w-full max-w-6750 rounded-200 bg-background-default">
        <div className="flex items-center justify-between px-500 pb-300 pt-500">
          <div className="flex flex-col gap-50">
            <h2 className="font-designer-20b text-gray-800">
              스크린샷 첨부해 보세요
            </h2>
            <p className="font-designer-14r text-gray-500">
              이미지 첨부 / 최대 {maxImages}장 첨부 가능합니다.
            </p>
          </div>
          <button type="button" onClick={handleClose} aria-label="닫기">
            <X className="size-300 text-gray-400 hover:text-gray-800" />
          </button>
        </div>

        <div className="px-500 pb-300">
          <div className="flex flex-wrap gap-200 pt-100 pr-100 pb-100">
            {images.map((entry, index) => (
              <div key={entry.previewUrl} className="relative w-1500 shrink-0">
                <Image
                  src={entry.previewUrl}
                  alt={`첨부 스크린샷 ${index + 1}`}
                  width={160}
                  height={120}
                  unoptimized
                  className="h-1500 w-full rounded-150 object-cover"
                />
                <Button
                  type="button"
                  aria-label="이미지 삭제"
                  onClick={() => handleRemove(index)}
                  className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents absolute -right-75 -top-75 flex size-250 items-center justify-center rounded-full bg-gray-800 text-background-default"
                >
                  <X className="size-150" />
                </Button>
              </div>
            ))}
            {canAddMore && (
              <Button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents flex h-1500 w-1500 shrink-0 flex-col items-center justify-center gap-100 rounded-150 border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-border-brand hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus className="size-400" />
                <span className="font-designer-14m text-center whitespace-nowrap">
                  {uploading ? '업로드 중...' : '이미지 추가'}
                </span>
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            aria-label="이미지 첨부"
            className="hidden"
            onChange={async (e) => {
              const input = e.currentTarget;
              const files = input.files ? Array.from(input.files) : [];
              if (files.length > 0) await handleFilesSelect(files);
              input.value = '';
            }}
          />
        </div>

        <div className="px-500 pb-500">
          <Button
            type="button"
            onClick={handleConfirm}
            color="primary"
            size="large"
            disabled={images.length === 0 || uploading}
            className="h-700 w-full font-designer-16m hover:bg-fill-brand-default-default active:bg-fill-brand-default-default disabled:bg-gray-300 disabled:text-text-inverse"
          >
            {uploading ? '업로드 중...' : '등록하기'}
          </Button>
        </div>
      </div>
    </div>
  );
}
