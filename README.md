# lesson-report-saas

Spring Boot + Kotlin backend for the Lesson Report SaaS MVP.

## Tech stack
- Kotlin + Java 21 (LTS)
- Spring Boot 4.0.3
- Spring Security (HTTP Basic for MVP bootstrap)
- Spring Data JPA + PostgreSQL
- Flyway migration
- Gradle Wrapper

## Project structure
- `src/main/kotlin`: application source
- `src/main/resources/db/migration`: Flyway SQL migrations
- `src/test/kotlin`: tests
- `.github/workflows/ci.yml`: GitHub Actions CI

## Quick start
1. Create PostgreSQL database and user.
2. Set runtime env vars (recommended) or edit `src/main/resources/application.yml`.
3. Run:
```bash
./gradlew bootRun
```

## Environment variables
- `APP_BASIC_USER` (default: `admin`)
- `APP_BASIC_PASSWORD` (default: `change_this_in_prod`)
- `APP_DEFAULT_INSTRUCTOR_ID` (default: `11111111-1111-1111-1111-111111111111`)
- `APP_SHARE_BASE_URL` (default: `http://localhost:8080/api/v1/share`)

DB (Spring datasource):
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`

## Build and test
```bash
./gradlew clean test build
```

## Health checks
- `GET /actuator/health` (public)
- `GET /actuator/info` (public)
- `GET /api/v1/ping` (auth required)

## API (MVP)
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

## Notes
- Flyway `V1` seeds one default instructor used by current MVP context logic.
- CI runs on pushes/PRs to `main`.
- For production, replace HTTP Basic bootstrap auth with JWT/OAuth2 and secure secrets via vault/secret manager.

## IntelliJ
Open this folder directly as a Gradle project. No separate IntelliJ project creation is needed.
