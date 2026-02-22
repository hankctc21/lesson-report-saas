# lesson-report-saas

필라테스 강사용 레슨 리포트 SaaS MVP 백엔드 프로젝트입니다.  
`Spring Boot + Kotlin + PostgreSQL` 기반으로 구성되어 있습니다.

## 기술 스택
- Kotlin + Java 21 (LTS)
- Spring Boot 4.0.3
- Spring Security (JWT Bearer 인증)
- springdoc OpenAPI + Swagger UI
- Spring Data JPA + PostgreSQL
- Flyway 마이그레이션
- Gradle Wrapper (`./gradlew`)

## 프로젝트 구조
- `src/main/kotlin`: 애플리케이션 소스 코드
- `src/main/resources/db/migration`: Flyway SQL 마이그레이션
- `src/test/kotlin`: 테스트 코드
- `.github/workflows/ci.yml`: GitHub Actions CI

## 빠른 시작
1. PostgreSQL DB/계정을 생성합니다.
2. 실행 환경변수(권장) 또는 `src/main/resources/application.yml` 값을 설정합니다.
3. 아래 명령으로 실행합니다.
```bash
./gradlew bootRun
```

## 환경변수
- `APP_AUTH_USERNAME` (default: `admin`)
- `APP_AUTH_PASSWORD` (default: `change_this_in_prod`)
- `APP_AUTH_SECRET` (default: `change-this-jwt-secret-min-32-bytes`)
- `APP_AUTH_TOKEN_TTL_MINUTES` (default: `120`)
- `APP_AUTH_INSTRUCTOR_ID` (default: `11111111-1111-1111-1111-111111111111`)
- `APP_DEFAULT_INSTRUCTOR_ID` (default: `11111111-1111-1111-1111-111111111111`)
- `APP_SHARE_BASE_URL` (default: `http://localhost:8080/api/v1/share`)

DB 연결(Spring datasource):
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`

## 빌드 및 테스트
```bash
./gradlew clean test build
```

## 헬스 체크
- `GET /actuator/health` (public)
- `GET /actuator/info` (public)
- `GET /api/v1/ping` (JWT 필요)

## 인증 및 Swagger
- 로그인: `POST /api/v1/auth/login`
- Swagger UI: `GET /swagger-ui/index.html`
- OpenAPI JSON: `GET /v3/api-docs`
- 로그인 후 발급된 `accessToken`을 `Authorization: Bearer <token>` 헤더로 전달하세요.

## MVP API
- `GET /api/v1/clients`
- `POST /api/v1/clients`
- `GET /api/v1/clients/{clientId}`
- `PATCH /api/v1/clients/{clientId}`
- `POST /api/v1/sessions`
- `GET /api/v1/sessions?date=YYYY-MM-DD`
- `POST /api/v1/reports`
- `GET /api/v1/reports/{reportId}`
- `PATCH /api/v1/reports/{reportId}`
- `GET /api/v1/clients/{clientId}/reports?limit=20`
- `POST /api/v1/reports/{reportId}/share`
- `GET /api/v1/share/{token}` (public)

## 참고 사항
- Flyway `V1`에서 기본 Instructor 1건을 시드 데이터로 생성합니다.
- CI는 `main` 브랜치 Push/PR 시 자동 실행됩니다.
- 운영 환경에서는 현재 단일 계정 JWT 부트스트랩에서 사용자/권한 기반 JWT(OAuth2/OIDC 포함)로 확장하는 것을 권장합니다.

## IntelliJ
이 폴더를 그대로 Gradle 프로젝트로 열면 됩니다.  
별도 IntelliJ 프로젝트를 새로 만들 필요는 없습니다.
