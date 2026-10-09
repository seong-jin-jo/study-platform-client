'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/common/ui/button';
import BorderedTextarea from '@/components/common/ui/input/bordered-textarea';
import {
  editKoan,
  cancelKoanSchedule,
  getKoanInventory,
  getPendingKoans,
  markKoanViewed,
  PendingKoan,
  publishKoan,
  rejectKoan,
  type KoanInventory,
} from './api';

const CHANNEL_LABEL = { SITE: '사이트', MAIL: '메일', SOCIAL: '소셜' } as const;

export default function KoanApprovalConsole() {
  const [items, setItems] = useState<PendingKoan[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PendingKoan | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [inventory, setInventory] = useState<KoanInventory | null>(null);
  const [scheduledPublishAt, setScheduledPublishAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  // 게시 화두는 최신순 한 페이지씩 불러온다. 오래된 정정 대상은 "더 보기"로 이어 부른다.
  const [publishedPage, setPublishedPage] = useState(0);
  const [hasMorePublished, setHasMorePublished] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [next, nextInventory] = await Promise.all([
        getPendingKoans(publishedPage),
        getKoanInventory(),
      ]);
      setItems(next.items);
      setHasMorePublished(next.hasMorePublished);
      setInventory(nextInventory);
      if (
        selectedId &&
        !next.items.some((item) => item.koanId === selectedId)
      ) {
        setSelectedId(null);
        setDraft(null);
      }
    } catch {
      setError('검토 대기 목록을 불러오지 못했습니다.');
    }
  }, [publishedPage, selectedId]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const openDetail = async (item: PendingKoan) => {
    setSelectedId(item.koanId);
    setDraft(structuredClone(item));
    setRejectReason('');
    setCorrectionReason('');
    setScheduledPublishAt(item.scheduledPublishAt?.slice(0, 16) ?? '');
    setError(null);
    try {
      await markKoanViewed(item.koanId);
    } catch {
      setError('열람 기록을 남기지 못해 승인이 잠겼습니다.');
    }
  };

  const save = async () => {
    if (!draft) return;
    // 게시된 화두 수정은 정정이라 사유가 계약상 필수다. 사유 없이 보내면 서버가 400 을 준다.
    if (draft.status === 'PUBLISHED' && !correctionReason.trim()) {
      setError('게시된 화두를 고치려면 정정 사유가 필요합니다.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await editKoan(draft, correctionReason);
      setSelectedId(null);
      setDraft(null);
      setCorrectionReason('');
      await reload();
    } catch {
      setError('수정 내용을 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await publishKoan(
        draft,
        scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
      );
      await reload();
    } catch {
      setError(
        '승인 조건을 충족하지 못했습니다. 수정 후 다시 열었는지 확인해 주세요.',
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelSchedule = async () => {
    if (!draft || draft.status !== 'QUEUED') return;
    setBusy(true);
    try {
      await cancelKoanSchedule(draft.koanId);
      setDraft(null);
      setSelectedId(null);
      await reload();
    } catch {
      setError('예약을 취소하지 못했습니다. 상태를 새로고침해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!draft || !rejectReason.trim()) {
      setError('반려 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await rejectKoan(draft.koanId, rejectReason.trim());
      await reload();
    } catch {
      setError('반려를 기록하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex min-h-screen gap-300 bg-background-alternative p-300">
      <aside className="w-300 shrink-0 rounded-150 border border-border-default bg-background-default p-200">
        <h1 className="font-designer-24b text-text-default">화두 통합 승인</h1>
        <p className="font-designer-14r mt-75 text-text-subtle">
          사이트, 메일, 소셜을 한 화면에서 검토합니다.
        </p>
        {inventory && (
          <p
            className="font-designer-13r mt-100 text-text-subtle"
            data-testid="koan-inventory"
          >
            검토 {inventory.reviewPendingCount} · 예약{' '}
            {inventory.approvedInventoryCount} · 가장 오래된 대기{' '}
            {inventory.oldestPendingDays}일
          </p>
        )}
        <div className="mt-200 flex flex-col gap-75">
          {items.map((item) => (
            <Button
              key={item.koanId}
              color={selectedId === item.koanId ? 'primary' : 'outlined'}
              onClick={() => {
                openDetail(item).catch(() => {});
              }}
            >
              {item.question}
            </Button>
          ))}
          {items.length === 0 && (
            <p className="font-designer-14r text-text-subtle">
              검토 대기 화두가 없습니다.
            </p>
          )}
          {hasMorePublished && (
            <Button
              color="outlined"
              data-testid="koan-load-more-published"
              onClick={() => setPublishedPage((page) => page + 1)}
            >
              게시된 화두 더 보기
            </Button>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1 rounded-150 border border-border-default bg-background-default p-250">
        {!draft ? (
          <p className="font-designer-16r text-text-subtle">
            왼쪽에서 화두를 선택해 주세요.
          </p>
        ) : (
          <div className="flex flex-col gap-250">
            <label className="font-designer-14b text-text-default">
              질문
              <BorderedTextarea
                className="mt-75 min-h-800"
                value={draft.question}
                onChange={(event) =>
                  setDraft({ ...draft, question: event.target.value })
                }
              />
            </label>
            <label className="font-designer-14b text-text-default">
              개념 요약
              <BorderedTextarea
                className="mt-75 min-h-1000"
                value={draft.conceptSummary}
                onChange={(event) =>
                  setDraft({ ...draft, conceptSummary: event.target.value })
                }
              />
            </label>
            <label className="font-designer-14b text-text-default">
              모델 답안
              <BorderedTextarea
                className="mt-75 min-h-1600"
                value={draft.modelAnswerMd}
                onChange={(event) =>
                  setDraft({ ...draft, modelAnswerMd: event.target.value })
                }
              />
            </label>

            <div className="grid grid-cols-3 gap-150">
              {draft.renders.map((render, index) => (
                <section
                  key={render.channel}
                  className="rounded-100 border border-border-default p-150"
                >
                  <h2 className="font-designer-18b text-text-default">
                    {CHANNEL_LABEL[render.channel]}
                  </h2>
                  <p className="font-designer-13r mt-50 text-text-subtle">
                    검토{' '}
                    {
                      render.verdicts.filter(
                        (verdict) => verdict.verdict === 'PASS',
                      ).length
                    }
                    /4 통과
                  </p>
                  <BorderedTextarea
                    className="mt-100 min-h-2000"
                    value={render.body}
                    onChange={(event) => {
                      const renders = [...draft.renders];
                      renders[index] = { ...render, body: event.target.value };
                      setDraft({ ...draft, renders });
                    }}
                  />
                </section>
              ))}
            </div>

            {error && (
              <p role="alert" className="font-designer-14b text-text-error">
                {error}
              </p>
            )}
            {draft.status === 'PUBLISHED' && (
              <label className="font-designer-14b text-text-default">
                정정 사유
                <BorderedTextarea
                  className="mt-75 min-h-800"
                  data-testid="koan-correction-reason"
                  value={correctionReason}
                  onChange={(event) => setCorrectionReason(event.target.value)}
                />
              </label>
            )}
            <div className="flex items-end gap-100">
              <Button
                color="secondary"
                disabled={busy}
                onClick={() => {
                  save().catch(() => {});
                }}
              >
                {draft.status === 'PUBLISHED' ? '정정 저장' : '수정 저장'}
              </Button>
              {draft.status === 'REVIEW_PENDING' && (
                <>
                  <label className="font-designer-14b text-text-default">
                    예약 시각
                    <input
                      className="mt-75 block rounded-75 border border-border-default p-100"
                      type="datetime-local"
                      value={scheduledPublishAt}
                      onChange={(event) =>
                        setScheduledPublishAt(event.target.value)
                      }
                    />
                  </label>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      publish().catch(() => {});
                    }}
                  >
                    세 채널 한 번에 승인
                  </Button>
                </>
              )}
              {draft.status === 'QUEUED' && (
                <Button
                  color="outlined"
                  disabled={busy}
                  onClick={() => {
                    cancelSchedule().catch(() => {});
                  }}
                >
                  예약 취소
                </Button>
              )}
            </div>
            {draft.status !== 'PUBLISHED' && (
              <div className="flex items-end gap-100 border-t border-border-default pt-200">
                <label className="font-designer-14b min-w-0 flex-1 text-text-default">
                  반려 사유
                  <BorderedTextarea
                    className="mt-75 min-h-800"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                  />
                </label>
                <Button
                  color="outlined"
                  disabled={busy}
                  onClick={() => {
                    reject().catch(() => {});
                  }}
                >
                  반려
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
