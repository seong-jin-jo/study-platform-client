-- STAMP | line=sprint8 | created=2026-08-07 19:32 KST
-- model=gpt-codex/gpt-5.6-sol | agent=qa-verifier | skill=goal-lock
-- evidence=https://playwright.dev/docs/api-testing
-- concern=round2 fixture ordering left paid NEXT and sixth conquest states incomplete.
--
-- Dev/test only. INSERT-only supplement applied after the round2 GH-A/GH-B seeds.

START TRANSACTION;

-- GH-026 gets an isolated zero-budget member; GH-029 must not consume the same
-- member state while preparing six conquered islands.
INSERT INTO member (
    member_id, oidc_id, login_id, member_status, auto_matching, applied_study,
    created_at, updated_at, role_id, is_verified
)
SELECT 981410, 'qa-s8-round3-zero-budget', 'qa-s8-round3-zero-budget',
       'ACTIVE', 'F', 'F', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6),
       'ROLE_MEMBER', 'T'
WHERE NOT EXISTS (SELECT 1 FROM member WHERE member_id = 981410);

INSERT INTO member_profile (
    member_id, member_name, nickname, email, simple_introduction, goal,
    public_profile_uuid
)
SELECT 981410, '잔액0잠금회원', 'QA GH-B 잔액0 잠금',
       'qa-s8-round3-zero-budget@invalid.zeroone',
       '잔액 0에서 유료 NEXT 편을 여는 실패 경로 전용 상태입니다.',
       '다른 개척·완독 테스트와 상태를 공유하지 않습니다.',
       '98141000-0000-4000-8000-000000001410'
WHERE NOT EXISTS (SELECT 1 FROM member_profile WHERE member_id = 981410);

INSERT INTO member_class_onboarding_state (
    member_id, last_step, vibe_coding_experience_level,
    privacy_consent_at, terms_consent_at, completed_at, created_at, updated_at
)
SELECT 981410, 'COMPLETED', 'BUILT_WORKING_RESULT', CURRENT_TIMESTAMP(6),
       CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6),
       CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (
    SELECT 1 FROM member_class_onboarding_state WHERE member_id = 981410
);

INSERT INTO member_reading_budget (
    member_id, balance, daily_cap, last_recharge_at, created_at, updated_at
)
SELECT 981410, 0, 5, '2099-12-31 06:00:00', CURRENT_TIMESTAMP(6),
       CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (
    SELECT 1 FROM member_reading_budget WHERE member_id = 981410
);

-- GH-017/GH-024/GH-026: make the known Strapi-backed paid article the NEXT
-- article by marking only its zero-cost predecessors READ for each isolated
-- member. The paid target itself remains unread and locked.
INSERT INTO member_insight_progress (
    member_id, document_id, state, unlocked_at, read_at, revision,
    created_at, updated_at
)
SELECT member_seed.member_id, predecessor.document_id, 'READ',
       CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), 0,
       CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
FROM (
    SELECT 981401 AS member_id
    UNION ALL SELECT 981405
    UNION ALL SELECT 981410
) AS member_seed
JOIN insight_article_projection target_projection
  ON target_projection.slug = 'short-transaction-long-lock-wait'
 AND target_projection.status = 'PUBLISHED'
JOIN insight_island_article target_link
  ON target_link.document_id = target_projection.document_id
 AND target_link.link_state = 'ACTIVE'
JOIN insight_island_article predecessor
  ON predecessor.island_id = target_link.island_id
 AND predecessor.link_state = 'ACTIVE'
 AND predecessor.required_node = TRUE
 AND predecessor.display_order < target_link.display_order
 AND predecessor.unlock_cost = 0
JOIN insight_article_projection predecessor_projection
  ON predecessor_projection.document_id = predecessor.document_id
 AND predecessor_projection.status = 'PUBLISHED'
WHERE NOT EXISTS (
    SELECT 1
    FROM member_insight_progress existing
    WHERE existing.member_id = member_seed.member_id
      AND existing.document_id = predecessor.document_id
);

INSERT INTO article_unlock (
    member_id, article_id, cost, unlocked_at, created_at, updated_at
)
SELECT progress.member_id, progress.document_id, 0, CURRENT_TIMESTAMP(6),
       CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
FROM member_insight_progress progress
WHERE progress.member_id IN (981401, 981405, 981410)
  AND progress.state = 'READ'
  AND NOT EXISTS (
      SELECT 1 FROM article_unlock existing
      WHERE existing.member_id = progress.member_id
        AND existing.article_id = progress.document_id
  );

-- GH-029/GH-033: round2 attached qa-s8-unlinked-visible-doc after its first
-- six conquest calculation. Complete every required node on that same island,
-- then materialize conquest for the map-priority read model.
INSERT INTO member_insight_progress (
    member_id, document_id, state, unlocked_at, read_at, revision,
    created_at, updated_at
)
SELECT member_seed.member_id, link.document_id, 'READ', CURRENT_TIMESTAMP(6),
       CURRENT_TIMESTAMP(6), 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
FROM (
    SELECT 981407 AS member_id
    UNION ALL SELECT 981408
) AS member_seed
JOIN insight_island_article anchor
  ON anchor.document_id = 'qa-s8-unlinked-visible-doc'
 AND anchor.link_state = 'ACTIVE'
JOIN insight_island_article link
  ON link.island_id = anchor.island_id
 AND link.link_state = 'ACTIVE'
 AND link.required_node = TRUE
JOIN insight_article_projection projection
  ON projection.document_id = link.document_id
 AND projection.status = 'PUBLISHED'
WHERE NOT EXISTS (
    SELECT 1 FROM member_insight_progress existing
    WHERE existing.member_id = member_seed.member_id
      AND existing.document_id = link.document_id
);

INSERT INTO member_island_conquest (member_id, island_id, conquered_at)
SELECT member_seed.member_id, anchor.island_id, CURRENT_TIMESTAMP(6)
FROM (
    SELECT 981407 AS member_id
    UNION ALL SELECT 981408
) AS member_seed
JOIN insight_island_article anchor
  ON anchor.document_id = 'qa-s8-unlinked-visible-doc'
 AND anchor.link_state = 'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM member_island_conquest existing
    WHERE existing.member_id = member_seed.member_id
      AND existing.island_id = anchor.island_id
)
  AND NOT EXISTS (
      SELECT 1
      FROM insight_island_article required_link
      WHERE required_link.island_id = anchor.island_id
        AND required_link.link_state = 'ACTIVE'
        AND required_link.required_node = TRUE
        AND NOT EXISTS (
            SELECT 1 FROM member_insight_progress progress
            WHERE progress.member_id = member_seed.member_id
              AND progress.document_id = required_link.document_id
              AND progress.state = 'READ'
        )
  );

COMMIT;

-- Required runner inputs (quote values exactly):
-- E2E_SPRINT8_ZERO_BUDGET_MEMBER_ID=981410
-- E2E_SPRINT8_PAID_SLUG=short-transaction-long-lock-wait
-- E2E_SPRINT8_FIRST_SLUG=deploy-finished-service-not-ready
-- E2E_SPRINT8_COMPLETION_LONG_SLUG=deploy-finished-service-not-ready
-- E2E_SPRINT8_COMPLETION_SHORT_SLUG=deploy-finished-service-not-ready
-- E2E_SPRINT8_QNA_PAGE_PATH=/community/questions/981409
-- E2E_SPRINT8_QNA_IMAGE_PATH=/images/og-image.png
--
-- SOURCES: round2 GH-A/GH-B seeds; Playwright API testing; MariaDB INSERT.
-- MODEL: gpt-codex/gpt-5.6-sol
-- SKILLS_USED: goal-lock / bounded INSERT-only state repair
-- SKILLS_SKIPPED: no dedicated QA/SQL skill available
