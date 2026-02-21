# lesson-report-saas

Spring Boot + Kotlin backend for the Lesson Report SaaS MVP.

## Stack
- Java 21 (LTS)
- Spring Boot 4.0.3
- Spring Security
- Spring Data JPA
- PostgreSQL
- Flyway
- Gradle

## Run (local)
1. Create PostgreSQL DB/user and update `src/main/resources/application.yml`.
2. Run:
   ```bash
   ./gradlew bootRun
   ```

## Test
```bash
./gradlew test
```

## Health checks
- `GET /actuator/health` (public)
- `GET /api/v1/ping` (requires authentication)

## MVP API
- `GET/POST/PATCH /api/v1/clients`
- `GET/POST /api/v1/sessions`
- `GET/POST/PATCH /api/v1/reports`
- `GET /api/v1/clients/{clientId}/reports`
- `POST /api/v1/reports/{reportId}/share`
- `GET /api/v1/share/{token}` (public)

## IntelliJ
Open this folder as a Gradle project. You do not need to create a separate IntelliJ project manually.
