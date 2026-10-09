# Product SSOT testing layer policy

이 문서는 Product SSOT 요구사항 검증에서 테스트를 두 층으로 나누는 기준을 설명한다.

## 1. 명세 추적 테스트

명세 추적 테스트는 요구사항 원장과 직접 연결되는 테스트다.

대상 예시:

- `src/test/resources/features/acceptance/**/*.feature`
- `src/test/resources/features/api/**/*.feature`
- `@REQ-*` 태그가 붙은 Cucumber / Karate 시나리오

이 테스트의 목적은 다음과 같다.

- `requirements.yaml`의 active 요구사항이 실제 시나리오로 검증되는지 확인
- PM / 기획 / QA와 같은 언어로 동작을 설명
- traceability 리포트에서 요구사항별 연결 상태를 확인

즉, 사용자 행위와 제품 정책을 검증하는 상위 테스트 층이다.

## 2. 기술 보강 테스트

기술 보강 테스트는 구현 세부 로직을 안정화하기 위한 테스트다.

대상 예시:

- `src/test/java/**/*Test.java`
- unit test
- repository test
- parser / mapper / util test
- fallback / null / exception / cache branch를 검증하는 focused test

이 테스트의 목적은 다음과 같다.

- 내부 분기와 edge case를 빠르게 검증
- 회귀를 조기에 차단
- branch coverage와 구현 안정성 보강
- 디버깅 비용 감소

이 층의 테스트는 기본적으로 `@REQ-*` 태그 연결 의무가 없다.

## 운영 원칙

1. 사용자 기능, 권한 정책, 인증 정책처럼 제품 요구사항으로 약속된 동작은 명세 추적 테스트가 반드시 있어야 한다.
2. 기술 보강 테스트는 명세 추적 테스트를 대체하지 않는다.
3. 내부 구현 분기, 예외 처리, parser / util / cache 동작은 기술 보강 테스트로 충분할 수 있다.
4. 하나의 요구사항이 중요한 정책을 담고 있다면, feature 기반 명세 추적 테스트와 기술 보강 테스트를 함께 둘 수 있다.

## 판단 기준

아래 질문에 “예”면 명세 추적 테스트를 우선 고려한다.

- 이 동작이 `requirements.yaml`에 있는 사용자 가치나 정책인가?
- PM / QA가 이 시나리오를 읽고 승인 여부를 판단해야 하는가?
- API contract나 권한 정책처럼 외부에 보이는 약속인가?

아래 질문에 “예”면 기술 보강 테스트로 두는 편이 자연스럽다.

- null / fallback / cache expire / parser branch 같은 내부 분기인가?
- 구현 세부 예외를 빠르게 재현해야 하는가?
- feature 시나리오로 표현하기보다 코드 수준 검증이 더 명확한가?
