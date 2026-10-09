'use client';

import Link from 'next/link';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import Pagination from '@/components/common/ui/pagination';
import { useAuth } from '@/features/auth/model/use-auth';
import { useCommunityQnaDetailController } from '@/features/community/model/use-community-qna-detail-controller';
import {
  useAssignCommunityQnaAnswerReactionMutation,
  useCreateCommunityQnaAnswerMutation,
} from '@/features/community/model/use-community-qna-mutation';
import CommunityMarkdownContent from '@/features/community/ui/community-markdown-content';
import {
  useKoanQuery,
  useKoansQuery,
} from '@/hooks/queries/insights/use-koan-query';
import styles from './sprint8-insights.module.css';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export default function KoanDetail({
  koanId,
  readOnly = false,
}: {
  koanId: number;
  readOnly?: boolean;
}) {
  const koanQuery = useKoanQuery(koanId);
  const relatedKoansQuery = useKoansQuery({
    categorySlug: koanQuery.data?.categorySlug,
    size: 4,
  });
  const qnaQuestionId = koanQuery.data?.qnaQuestionId ?? 0;
  const qna = useCommunityQnaDetailController({ questionId: qnaQuestionId });
  const createAnswer = useCreateCommunityQnaAnswerMutation();
  const answerReaction = useAssignCommunityQnaAnswerReactionMutation();
  const { isAuthenticated } = useAuth();
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPrompt, setComposerPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const koan = koanQuery.data;

  const submitAnswer = async () => {
    if (!koan || !answer.trim()) return;
    await createAnswer.mutateAsync({
      questionId: koan.qnaQuestionId,
      request: { contentHtml: `<p>${escapeHtml(answer.trim())}</p>` },
    });
    setAnswer('');
    setComposerOpen(false);
    await qna.actions.refetchQuestionDetail();
  };

  if (!Number.isInteger(koanId) || koanId <= 0 || koanQuery.isError) {
    return (
      <main className={styles.root}>
        <div className={styles.stateCard} role="alert">
          <b>이 화두를 찾지 못했습니다</b>
          <p>주소가 바뀌었거나 아직 공개되지 않은 물음입니다.</p>
          <Link href="/insights/koans" className={styles.stateAction}>
            화두 목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (!koan || !qna.state.isResolved) {
    return (
      <main className={styles.root}>
        <div className={styles.stateCard} aria-busy="true">
          <b>화두와 보완 답변을 불러오는 중입니다</b>
          <p>물음과 현장 경험이 도착할 자리를 준비하고 있습니다.</p>
        </div>
      </main>
    );
  }

  if (qna.state.errorInfo) {
    return (
      <main className={styles.root} data-testid="koan-detail">
        <div className={styles.stateCard} role="alert">
          <b>보완 답변을 불러오지 못했습니다</b>
          <p>{qna.state.errorInfo.userMessage}</p>
          <Button
            type="button"
            color="primary"
            size="large"
            onClick={() => qna.actions.refetchQuestionDetail()}
          >
            다시 불러오기
          </Button>
        </div>
      </main>
    );
  }

  const answers = [
    ...(qna.state.acceptedAnswer ? [qna.state.acceptedAnswer] : []),
    ...(qna.state.answersPageData?.items ?? []),
  ];
  const answerCount = qna.viewModel.answerCount ?? koan.answerCount;
  const relatedKoans =
    relatedKoansQuery.data?.items
      .filter(
        (item) =>
          item.koanId !== koan.koanId &&
          item.categorySlug === koan.categorySlug,
      )
      .slice(0, 3) ?? [];

  return (
    <main className={styles.root} data-testid="koan-detail">
      <div className={styles.detailPage}>
        <div className={styles.detailMain}>
          <Link
            href="/insights/koans"
            className="font-designer-13b inline-flex min-h-550 items-center text-text-subtle"
          >
            ← 화두
          </Link>

          <div className={styles.disclosure}>
            이 답은 <b>AI가 정리한 초안</b>이고 <b>사람이 검토해 올렸습니다.</b>{' '}
            틀린 곳은 고치고 기록을 남깁니다.
            {koan.corrections.length > 0 && (
              <details className="mt-75">
                <summary className="cursor-pointer font-designer-12b">
                  정정 {koan.corrections.length}회 보기
                </summary>
                {koan.corrections.map((correction) => (
                  <div
                    key={correction.correctionId}
                    className="mt-75 rounded-100 border border-border-information bg-background-default p-125"
                  >
                    <p className="font-designer-12b text-text-subtlest">
                      {formatDate(correction.correctedAt)} · {correction.reason}
                    </p>
                    <p className="font-designer-12r mt-50 text-text-default">
                      {correction.beforeText && <s>{correction.beforeText}</s>}
                      {correction.afterText && ` → ${correction.afterText}`}
                    </p>
                  </div>
                ))}
              </details>
            )}
          </div>

          <h1 className={styles.detailTitle}>{koan.question}</h1>
          <p className={styles.purpose}>
            아래 답은 <b>끝난 답이 아닙니다.</b> 당신 현장에서 다르게 굴러간
            이야기가 이 답을 고칩니다.
          </p>
          <div className={styles.detailMeta}>
            <span className={styles.categoryChip}>
              {koan.categoryName} 섬에서 나온 물음
            </span>
            <span>{formatDate(koan.publishedAt)}</span>
            <span>·</span>
            <span>보완 {answerCount}</span>
          </div>

          <section className={styles.detailSection}>
            <h2>이 물음을 이해하는 데 필요한 개념</h2>
            <p className={styles.detailBody}>{koan.conceptSummary}</p>
          </section>

          <section className={styles.detailSection}>
            <div className={styles.detailAuthor}>
              <span className={styles.aiChip}>AI가 정리한 초안</span>
              <span className={styles.reviewedChip}>사람이 검토함</span>
            </div>
            <h2 className={styles.answerTitle}>이 물음에 대한 답</h2>
            <div className={styles.detailBody}>
              <ReactMarkdown>{koan.modelAnswerMd}</ReactMarkdown>
            </div>
          </section>

          <div className={styles.proof}>
            <span>
              <b>{koan.viewCount}명</b>이 이 물음을 봤어요
            </span>
            <span>보완 {answerCount}</span>
            {!readOnly ? (
              <Button
                type="button"
                color="outlined"
                size="medium"
                className={cn(
                  styles.helpfulButton,
                  'hover:bg-background-default active:bg-background-default disabled:border-gray-300 disabled:bg-gray-0 disabled:text-gray-700',
                )}
                onClick={qna.actions.handleToggleQuestionLike}
                aria-pressed={qna.viewModel.isQuestionLikedByViewer}
                disabled={qna.viewModel.isQuestionReactionPending}
              >
                도움됐어요 {qna.viewModel.questionLikeCount}
              </Button>
            ) : null}
          </div>

          {!readOnly ? (
            <section className={styles.composer} id="koan-composer">
              {!composerOpen ? (
                <div className={styles.composerPrompts}>
                  {[
                    '당신 현장에서는 어떻게 다른가요?',
                    '이 답에서 빠진 게 있나요?',
                  ].map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      color="secondary"
                      size="large"
                      className={cn(
                        styles.composerToggle,
                        'justify-start bg-background-default hover:bg-background-default active:bg-background-default',
                      )}
                      onClick={() => {
                        setComposerPrompt(prompt);
                        setComposerOpen(true);
                      }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              ) : isAuthenticated ? (
                <div className={styles.composerOpen}>
                  <p className="font-designer-12b text-text-brand">
                    답을 보완합니다
                  </p>
                  <h2 className="font-designer-18b mt-75 text-text-strong">
                    실제로 겪은 조건과 결과를 적어 주세요
                  </h2>
                  <textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder={
                      composerPrompt ||
                      '어떤 환경에서 무엇이 달랐는지 적어 주세요.'
                    }
                    data-testid="koan-answer-input"
                  />
                  <Button
                    type="button"
                    color="primary"
                    size="large"
                    className={cn(
                      styles.submit,
                      'hover:bg-rose-500 active:bg-rose-500 disabled:bg-rose-500 disabled:text-gray-0',
                    )}
                    onClick={submitAnswer}
                    disabled={!answer.trim() || createAnswer.isPending}
                    data-testid="koan-answer-submit"
                  >
                    {createAnswer.isPending ? '보내는 중' : '내 경험 남기기'}
                  </Button>
                </div>
              ) : (
                <div className={styles.composerOpen}>
                  <p className="font-designer-14b text-text-strong">
                    로그인하면 이 답에 내 경험을 보탤 수 있어요.
                  </p>
                  <Link href="/login" className={styles.submit}>
                    3초 로그인
                  </Link>
                </div>
              )}
            </section>
          ) : null}

          <section className="mt-300">
            <div className={styles.sectionTitle}>
              <h2>사람들이 보탠 답</h2>
              <span>{answerCount}개의 현장 경험</span>
            </div>
            {answers.length === 0 && (
              <div className={styles.empty}>
                아직 보완 답변이 없습니다. 첫 경험을 남겨 주세요.
              </div>
            )}
            {answers.map((item) => (
              <article key={item.id} className={styles.answer}>
                <div className={styles.answerHeader}>
                  <b>{item.author.name}</b>
                  <span>{item.createdAt}</span>
                  {item.isAccepted && (
                    <span className="rounded-full bg-fill-success-default px-100 py-50 font-designer-12b text-text-inverse">
                      보완 채택
                    </span>
                  )}
                </div>
                <div className={styles.answerBody}>
                  <CommunityMarkdownContent content={item.contentHtml} />
                </div>
                {!readOnly ? (
                  <div className={styles.answerFooter}>
                    <Button
                      type="button"
                      color="outlined"
                      size="medium"
                      className={cn(
                        styles.quietButton,
                        'hover:bg-background-default active:bg-background-default',
                      )}
                      onClick={() =>
                        answerReaction.mutate({
                          questionId: koan.qnaQuestionId,
                          answerId: item.id,
                          type:
                            item.viewer.reaction === 'like' ? 'none' : 'like',
                        })
                      }
                      aria-pressed={item.viewer.reaction === 'like'}
                    >
                      도움됐어요 {item.stats.likeCount}
                    </Button>
                    <Link
                      href={`/community/questions/${koan.qnaQuestionId}`}
                      className={styles.quietButton}
                    >
                      댓글 {item.stats.commentCount}
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
            {qna.viewModel.showAnswerPagination && (
              <Pagination
                page={qna.viewModel.answerPage}
                totalPages={qna.viewModel.answerTotalPages}
                onChangePage={qna.actions.handleAnswerPageChange}
                className="mt-300"
              />
            )}
          </section>

          <div className={styles.detailBridge}>
            <div>
              <b>{koan.categoryName}을 순서대로 보고 싶다면</b>
              <span>같은 분야 안에 물음과 개념글이 함께 있습니다</span>
            </div>
            {!readOnly ? (
              <Link href={`/insights/land/${koan.categorySlug}`}>
                {koan.categoryName} 전체 보기
              </Link>
            ) : null}
          </div>
        </div>

        <aside className={styles.rail}>
          {!readOnly ? (
            <div className={styles.railCard}>
              <h3>당신 현장에서는?</h3>
              <p>
                개념을 몰라도 됩니다. 정답이 아니어도 됩니다. 겪은 일 한 줄이면
                충분해요.
              </p>
              {/* biome-ignore lint/a11y/useValidAnchor: This preserves the web fragment-navigation contract and its anchor-only CSS. */}
              <a
                href="#koan-composer"
                className={styles.railCta}
                onClick={() => setComposerOpen(true)}
              >
                나는 이랬어요
              </a>
            </div>
          ) : null}
          {relatedKoans.length > 0 && (
            <div className={styles.relatedCard}>
              <h3>{koan.categoryName}의 다른 물음</h3>
              <div>
                {relatedKoans.map((item) => (
                  <Link
                    key={item.koanId}
                    href={`/insights/koans/${item.koanId}`}
                  >
                    {item.question}
                    <small>보완 {item.answerCount}</small>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {!readOnly ? (
            <Link
              href={`/insights/land/${koan.categorySlug}`}
              className="font-designer-13b mt-150 flex min-h-550 items-center justify-between rounded-150 border border-border-subtle bg-background-default px-175 text-text-default"
            >
              {koan.categoryName} 개념글 <span aria-hidden>→</span>
            </Link>
          ) : null}
        </aside>
      </div>
      {!readOnly ? (
        <div className={styles.detailMobileBar}>
          <span>{answerCount}명이 이미 보탰어요</span>
          {/* biome-ignore lint/a11y/useValidAnchor: This preserves the web fragment-navigation contract and its anchor-only CSS. */}
          <a href="#koan-composer" onClick={() => setComposerOpen(true)}>
            나는 이랬어요
          </a>
        </div>
      ) : null}
    </main>
  );
}
