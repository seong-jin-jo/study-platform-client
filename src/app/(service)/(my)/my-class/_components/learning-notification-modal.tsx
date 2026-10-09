'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/common/ui/button';
import { Modal } from '@/components/common/ui/modal';
import {
  useGetNotificationSetting,
  useUpdateNotificationSetting,
} from '@/hooks/queries/notification/use-notification-setting';
import { useToastStore } from '@/stores/use-toast-store';

interface LearningNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
// 알림톡은 정시(00분)에만 발송한다 — 분은 사용자가 바꿀 수 없다.
const FIXED_MINUTE = 0;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function LearningNotificationModal({
  open,
  onOpenChange,
  onSuccess,
}: LearningNotificationModalProps) {
  const showToast = useToastStore((s) => s.showToast);
  const { data: setting } = useGetNotificationSetting();
  const updateSettingMutation = useUpdateNotificationSetting();

  // 기본 발송 시각은 정오(12시). 분은 항상 00분 고정.
  const [hour, setHour] = useState(12);

  useEffect(() => {
    if (typeof setting?.notifyHour === 'number') setHour(setting.notifyHour);
  }, [setting]);

  const handleSave = async () => {
    try {
      await updateSettingMutation.mutateAsync({
        notifyHour: hour,
        notifyMinute: FIXED_MINUTE,
        // 시간 저장은 곧 알림 수신을 켜는 동작이다.
        isEnabled: true,
      });
      showToast('알림 시간이 저장되었습니다.', 'success');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      showToast('알림 시간 저장에 실패했습니다.', 'error');
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Portal>
        <Modal.Overlay />
        <Modal.Content size="medium">
          <Modal.Header variant="alert">
            <Modal.Title>학습 알림톡 시간 설정</Modal.Title>
          </Modal.Header>

          <Modal.Body variant="alert">
            <div className="flex flex-col gap-300">
              <p className="font-designer-14r text-text-subtle text-center">
                매일 학습 알림을 받을 시간을 설정해 주세요.
              </p>
              <div className="flex items-center justify-center gap-200">
                <div className="flex flex-col gap-100">
                  <label
                    htmlFor="notify-hour"
                    className="font-designer-12r text-text-subtle text-center"
                  >
                    시
                  </label>
                  <select
                    id="notify-hour"
                    value={hour}
                    onChange={(e) => setHour(Number(e.target.value))}
                    className="border-border-default rounded-100 font-designer-16m text-text-default w-1250 border px-200 py-150 outline-none"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {pad(h)}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="font-designer-20b text-text-default mt-300">
                  :
                </span>

                <div className="flex flex-col gap-100">
                  <span className="font-designer-12r text-text-subtle text-center">
                    분
                  </span>
                  <div className="border-border-default bg-background-alternative rounded-100 font-designer-16m text-text-subtle w-1250 border px-200 py-150 text-center">
                    00
                  </div>
                </div>
              </div>

              <p className="font-designer-12r text-text-subtlest text-center">
                매일 {pad(hour)}:00 정시에 발송됩니다. (분은 변경할 수 없어요)
              </p>
            </div>
          </Modal.Body>

          <Modal.Footer variant="alert">
            <div className="flex gap-200">
              <Button
                color="secondary"
                size="medium"
                className="flex-1 whitespace-nowrap"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button
                color="primary"
                size="medium"
                className="flex-1 whitespace-nowrap"
                disabled={updateSettingMutation.isPending}
                onClick={handleSave}
              >
                {updateSettingMutation.isPending ? '저장 중...' : '저장하기'}
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Portal>
    </Modal.Root>
  );
}
