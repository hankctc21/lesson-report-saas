# Development Log

이 문서는 `git commit` 로그를 사람이 빠르게 이해할 수 있도록 보강한 기록입니다.
코드 변경 의도, 영향 범위, 검증 포인트를 함께 남깁니다.

## Commit Timeline

### 2026-02-21

- `3556ff1` `chore: bootstrap Kotlin Spring Boot MVP`
  - 초기 프로젝트 스캐폴딩 생성
  - Kotlin + Spring Boot + JPA + PostgreSQL + Flyway 기본 구조 추가
  - 핵심 API 초안(`clients`, `sessions`, `reports`, `share`) 및 엔티티/리포지토리 구성
  - 초기 마이그레이션 `V1__init.sql` 추가

### 2026-02-22

- `1784e76` `ci: add GitHub Actions Gradle build pipeline`
  - GitHub Actions 기반 빌드 파이프라인 추가
  - `.gitignore` 보강

- `74de403` `docs: refresh README for Kotlin MVP setup`
  - README 실행/구성 안내 업데이트

- `99e67c9` `feat: add JWT auth, Swagger docs, and auth unit tests`
  - JWT 로그인/인증 필터 도입
  - Swagger/OpenAPI 설정 추가
  - 인증 관련 테스트(AuthController/AuthService/JwtService) 추가
  - 보안/인증 흐름 기반으로 API 접근 제어 개선

- `d215ccc` `Fix local run setup and default app port to 18080`
  - 로컬 PostgreSQL 실행용 `compose.yml` 추가
  - 기본 포트를 `18080`으로 정렬 (`application.yml`, README)
  - Flyway 실행 문제 해결을 위해 의존성 정리
    - `spring-boot-starter-flyway`
    - `flyway-database-postgresql`
  - 공유 URL 기본값을 `18080` 기준으로 정렬

## Why These Changes Matter

- 로컬 실행 안정성 확보
  - DB 미기동/스키마 미적용/포트 충돌 이슈를 재현 가능하게 해결
- 배포 전 기본 품질 확보
  - 인증, 문서, 테스트, CI가 기본 동작하는 상태로 정리
- 프론트 연동 준비
  - Swagger와 JWT 기반으로 프론트 개발 시 즉시 API 사용 가능

## Verification Notes (2026-02-22)

- PostgreSQL 컨테이너 정상 기동 및 연결 확인
- Flyway 마이그레이션 적용 확인
  - `flyway_schema_history` 생성
  - `v1` 적용 성공
- 애플리케이션 기동 확인
  - `Tomcat started on port 18080`
  - `Started LessonReportSaasApplicationKt`
- 헬스체크 확인
  - `GET /actuator/health` -> `200`, `status: UP`

## Commit Message Guideline (Recommended)

- 형식: `type: short summary`
- 권장 type
  - `feat`: 기능 추가
  - `fix`: 버그/오동작 수정
  - `docs`: 문서 변경
  - `refactor`: 동작 변경 없는 구조 개선
  - `test`: 테스트 추가/수정
  - `chore`: 빌드/설정/유틸
  - `ci`: CI/CD 변경

예시:

- `feat: add report share expiration validation`
- `fix: run flyway migrations before JPA validate`
- `docs: add local run guide for port 18080`
