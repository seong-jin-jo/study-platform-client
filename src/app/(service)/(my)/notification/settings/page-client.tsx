'use client';

import { useState } from 'react';
import Button from '@/components/common/ui/button';
import SurfacePanel from '@/components/common/ui/surface-panel';
import TextActionButton from '@/components/common/ui/text-action-button';
import { ToggleSwitch } from '@/components/common/ui/toggle/switch';
import {
  useGetNotificationSetting,
  useUpdateNotificationSetting,
} from '@/hooks/queries/notification/use-notification-setting';
import { useToastStore } from '@/stores/use-toast-store';
import AppVersion from './app-version';

const DISABLE_REASONS = [
  '너무 자주 와요',
  '내용이 나한테 안 맞아요',
  '그냥 안 볼래요',
] as const;

export default function NotificationSettingsPage() {
  const { data: setting, isLoading } = useGetNotificationSetting();
  const updateSetting = useUpdateNotificationSetting();
  const showToast = useToastStore((state) => state.showToast);
  const [reasonOpen, setReasonOpen] = useState(false);
  const isEnabled = setting?.isEnabled ?? true;

  const updateEnabled = async (nextEnabled: boolean) => {
    try {
      await updateSetting.mutateAsync({
        notifyHour: setting?.notifyHour ?? 12,
        notifyMinute: setting?.notifyMinute ?? 0,
        isEnabled: nextEnabled,
      });
      showToast(
        nextEnabled ? '알림을 다시 켰어요.' : '알림을 전부 껐어요.',
        'success',
      );
      setReasonOpen(false);
    } catch {
      showToast('알림 설정을 바꾸지 못했어요.', 'error');
    }
  };

  const requestUpdateEnabled = (nextEnabled: boolean) => {
    updateEnabled(nextEnabled).catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-300">
      <h1 className="font-designer-20b text-text-strong">알림 설정</h1>

      <SurfacePanel as="section" radius="lg" className="p-300">
        <h2 className="font-designer-15b text-text-strong">
          어떤 알림을 받을까요
        </h2>
        <SettingStatusRow
          label="공부방 소식"
          description="내 글에 답이 달리거나 새 방이 열릴 때"
          enabled={isEnabled}
        />
        <SettingStatusRow
          label="인사이트 새 글"
          description="새 글이 올라올 때"
          enabled={isEnabled}
        />
        <div className="flex min-h-800 items-center justify-between gap-200 border-t border-border-subtle">
          <div>
            <p className="font-designer-14b text-text-default">
              카카오톡으로도 받기
            </p>
            <p className="mt-25 font-designer-12r text-text-subtle">
              하루 1건을 넘지 않아요. 여기서 끄면 카카오톡은 오지 않습니다.
            </p>
          </div>
          <ToggleSwitch.Root
            checked={isEnabled}
            disabled={isLoading || updateSetting.isPending}
            onCheckedChange={(checked) => {
              if (checked) requestUpdateEnabled(true);
              else setReasonOpen(true);
            }}
            size="lg"
          />
        </div>
      </SurfacePanel>

      <SurfacePanel as="section" radius="lg" className="p-300">
        <div className="flex min-h-700 items-center justify-between gap-200">
          <div>
            <p className="font-designer-14b text-text-default">
              알림 전부 끄기
            </p>
            <p className="mt-25 font-designer-12r text-text-subtle">
              꼭 필요한 안내(계정·결제)는 계속 갑니다.
            </p>
          </div>
          <ToggleSwitch.Root
            checked={!isEnabled}
            disabled={isLoading || updateSetting.isPending}
            onCheckedChange={(checked) => {
              if (checked) setReasonOpen(true);
              else requestUpdateEnabled(true);
            }}
            size="lg"
          />
        </div>
      </SurfacePanel>

      <p className="font-designer-12r text-text-subtle">
        알림을 끄고도 언제든 여기서 다시 켤 수 있어요.
      </p>

      <AppVersion />

      {reasonOpen && (
        <div className="rounded-200 border border-border-subtle bg-background-default p-300 shadow-2">
          <h2 className="font-designer-18b text-text-strong">
            혹시 어떤 점이 불편했나요
          </h2>
          <p className="mt-75 font-designer-13r text-text-subtle">
            한 번만 여쭤봐요. 안 고르고 넘어가도 알림은 그대로 꺼집니다.
          </p>
          <div className="mt-200 flex flex-col gap-100">
            {DISABLE_REASONS.map((reason) => (
              <Button
                key={reason}
                type="button"
                color="outlined"
                size="large"
                onClick={() => requestUpdateEnabled(false)}
                className="h-auto min-h-550 justify-start border-border-subtle px-200 font-designer-14m"
              >
                {reason}
              </Button>
            ))}
            <TextActionButton
              type="button"
              onClick={() => requestUpdateEnabled(false)}
              weight="bold"
              className="min-h-550 border-0 p-0"
            >
              건너뛰기
            </TextActionButton>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingStatusRow({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="flex min-h-800 items-center justify-between gap-200 border-t border-border-subtle">
      <div>
        <p className="font-designer-14b text-text-default">{label}</p>
        <p className="mt-25 font-designer-12r text-text-subtle">
          {description}
        </p>
      </div>
      <span className="rounded-full bg-background-neutral-subtle px-150 py-75 font-designer-11b text-text-subtle">
        {enabled ? '받는 중' : '꺼짐'}
      </span>
    </div>
  );
}
