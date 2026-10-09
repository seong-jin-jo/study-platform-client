# Backend docs

`docs/backend/`는 통합 모노레포에서 backend 구현, API contract, DB/Flyway, local backend run 문서를 둘 위치다.

backend 코드는 전환 후 `backend/` 아래로 이관하는 것을 기본 방향으로 한다. 전환 완료 전까지 실제 backend source는 `../study-platform-mvp`가 기준이다.

## 넣는 문서

- backend local development
- API contract export와 Swagger/OpenAPI 운영
- Flyway migration과 DB schema 운영
- controller/service/repository 구현 정책
- backend profile과 dev.local 검증 절차

## 넣지 않는 문서

- frontend 컴포넌트/상태관리 구현 설명
- 제품 요구사항 원장
- production release record 자체

## 현재 기준

- backend stack 기준은 Spring Boot 3.4.x, Java 21, Gradle Kotlin DSL, Flyway 10.x다.
- local backend 검증은 기존 `dev.local` profile 정책을 우선한다.
- backend code/API/DB 변경 후에는 `skills_context/SHARED/study-platform-backend-verify.md` 이관본 또는 기존 `../study-platform-mvp`의 backend verify 문서를 따른다.
