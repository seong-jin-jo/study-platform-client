# Product SSOT traceability rules

이 문서는 `docs/product-ssot/{domain}/requirements.yaml` 요구사항과 Cucumber/Karate feature 파일을 연결하는 규칙이다.

## ID 규칙

요구사항 ID는 다음 형식을 사용한다.

```text
REQ-{DOMAIN}-{NUMBER}
```

예시:

```text
REQ-AUTH-001
REQ-MEMBER-001
REQ-COURSE-001
```

## Feature tag 규칙

Cucumber acceptance scenario와 Karate API scenario는 관련 요구사항 ID를 tag로 가진다.

```gherkin
@REQ-AUTH-003
Scenario: 보호 API를 토큰 없이 호출하면 401을 반환한다
```

N:M 매핑이 필요하면 여러 요구사항 태그를 붙인다.

```gherkin
@REQ-AUTH-002 @REQ-TOKEN-001
Scenario: 유효한 토큰으로 내 정보를 조회한다
```

## 검증 규칙

초기 도입 단계의 검증 기준은 다음과 같다.

| Case | Result |
| --- | --- |
| feature에 있는 `@REQ-*`가 YAML에 없음 | fail |
| YAML의 active 요구사항이 feature에 전혀 없음 | warning |
| 시나리오에 일반 태그만 있고 `@REQ-*`가 없음 | warning |
| 동일 요구사항이 acceptance와 api 모두에 연결됨 | ok |

도입 안정화 후에는 active 요구사항 미연결을 fail로 올릴 수 있다.

## 적용 범위

`@REQ-*` 태그 연결 규칙은 기본적으로 다음 feature 기반 테스트에 적용한다.

- `src/test/resources/features/acceptance/**/*.feature`
- `src/test/resources/features/api/**/*.feature`

즉, Product SSOT와 직접 대화해야 하는 명세 추적 테스트가 기본 적용 대상이다.

반대로 다음 테스트는 기본적으로 `@REQ-*` 태그 연결 의무 대상이 아니다.

- `src/test/java/**/*Test.java`
- unit test
- repository test
- parser / mapper / util test
- fallback / null / exception / cache branch를 검증하는 focused test

이 테스트들은 내부 로직 안정성, 회귀 방지, branch coverage 보강을 위한 기술 보강 테스트로 본다.

단, 사용자 기능이나 정책이 제품 요구사항으로 약속된 경우에는 JUnit 테스트만으로 대체하지 않고, 관련 feature 기반 명세 추적 테스트도 함께 유지한다.

## Source와 생성물

- Source: `docs/product-ssot/{domain}/requirements.yaml`
- Source: `src/test/resources/features/**/*.feature`
- Generated: `build/reports/traceability/`

생성 리포트는 Git SSOT로 취급하지 않는다.
